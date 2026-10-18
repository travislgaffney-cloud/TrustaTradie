import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { tradesafeRequest, mapBank, mapAccountType } from '../_shared/tradesafe.ts';
import { checkRateLimit, rateLimitResponse, getClientIp } from '../_shared/rate-limit.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const APP_URL = 'https://admin-five-chi-53.vercel.app';

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return { givenName: parts[0] || fullName, familyName: parts.slice(1).join(' ') || parts[0] || fullName };
}

async function ensureToken(profile: {
  id: string;
  full_name: string;
  phone: string | null;
  tradesafe_token: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_type?: string | null;
}, email: string | undefined, includeBank: boolean): Promise<string> {
  if (profile.tradesafe_token) return profile.tradesafe_token;

  const { givenName, familyName } = splitName(profile.full_name);

  const input: Record<string, unknown> = {
    user: { givenName, familyName, email, mobile: profile.phone ?? undefined },
  };

  if (includeBank) {
    if (!profile.bank_account_number) {
      throw new Error('TRADIE_BANK_MISSING');
    }
    input.bankAccount = {
      accountNumber: profile.bank_account_number,
      accountType: mapAccountType(profile.bank_account_type),
      bank: mapBank(profile.bank_name),
    };
  }

  const data = await tradesafeRequest<{ tokenCreate: { id: string } }>(
    `mutation($input: TokenInput) { tokenCreate(input: $input) { id } }`,
    { input }
  );

  const tokenId = data.tokenCreate.id;
  await supabaseAdmin.from('profiles').update({ tradesafe_token: tokenId }).eq('id', profile.id);
  return tokenId;
}

Deno.serve(async (req) => {
  try {
    const ip = getClientIp(req);
    const ipLimit = await checkRateLimit(supabaseAdmin, `ip:${ip}:tradesafe-checkout`, { limit: 20, windowSeconds: 300 });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSeconds);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const userLimit = await checkRateLimit(supabaseAdmin, `user:${caller.id}:tradesafe-checkout`, { limit: 5, windowSeconds: 300 });
    if (!userLimit.allowed) return rateLimitResponse(userLimit.retryAfterSeconds);

    const { jobId, method } = (await req.json()) as { jobId: string; method?: 'EFT' | 'OZOW' };
    if (!jobId) return new Response(JSON.stringify({ error: 'Missing jobId' }), { status: 400 });
    const depositMethod = method === 'OZOW' ? 'OZOW' : 'EFT';

    // Load our internal transaction row — must already exist (created when the
    // quote was accepted) and be waiting on payment.
    const { data: txn, error: txnError } = await supabaseAdmin
      .from('transactions')
      .select('id, job_id, customer_id, tradie_id, quoted_amount, commission_pct, status, tradesafe_transaction_id')
      .eq('job_id', jobId)
      .single();

    if (txnError || !txn) return new Response(JSON.stringify({ error: 'Transaction not found' }), { status: 404 });
    if (txn.customer_id !== caller.id) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    if (txn.status !== 'accepted') {
      return new Response(JSON.stringify({ error: `Transaction is not awaiting payment (status: ${txn.status})` }), { status: 409 });
    }

    const { data: job } = await supabaseAdmin.from('jobs').select('title, description').eq('id', jobId).single();
    const { data: customerProfile } = await supabaseAdmin.from('profiles').select('id, full_name, phone, tradesafe_token').eq('id', txn.customer_id).single();
    const { data: tradieProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone, tradesafe_token, bank_name, bank_account_number, bank_account_type')
      .eq('id', txn.tradie_id)
      .single();
    const { data: settings } = await supabaseAdmin.from('platform_settings').select('tradesafe_agent_token').eq('id', true).single();

    if (!customerProfile || !tradieProfile) {
      return new Response(JSON.stringify({ error: 'Profile data missing' }), { status: 500 });
    }
    if (!settings?.tradesafe_agent_token) {
      return new Response(JSON.stringify({ error: 'Platform payment setup incomplete — no agent token configured' }), { status: 500 });
    }

    const { data: { user: customerAuth } } = await supabaseAdmin.auth.admin.getUserById(txn.customer_id);
    const { data: { user: tradieAuth } } = await supabaseAdmin.auth.admin.getUserById(txn.tradie_id);

    let buyerToken: string, sellerToken: string;
    try {
      buyerToken = await ensureToken(customerProfile, customerAuth?.email, false);
      sellerToken = await ensureToken(tradieProfile, tradieAuth?.email, true);
    } catch (err) {
      if (err instanceof Error && err.message === 'TRADIE_BANK_MISSING') {
        return new Response(JSON.stringify({ error: 'The tradie has not added their bank details yet' }), { status: 409 });
      }
      throw err;
    }

    const title = job?.title ?? 'Trust-a-Tradie job';
    const description = job?.description || title;

    const created = await tradesafeRequest<{ transactionCreate: { id: string; reference: string; allocations: { id: string }[] } }>(
      `mutation($input: CreateTransactionInput) {
        transactionCreate(input: $input) { id reference allocations { id } }
      }`,
      {
        input: {
          title,
          description,
          industry: 'CONSTRUCTION',
          currency: 'ZAR',
          feeAllocation: 'SELLER',
          workflow: 'STANDARD',
          reference: txn.id,
          allocations: {
            create: [{ title, description, value: txn.quoted_amount, daysToDeliver: 14, daysToInspect: 7 }],
          },
          parties: {
            create: [
              { token: buyerToken, role: 'BUYER' },
              { token: sellerToken, role: 'SELLER' },
              {
                token: settings.tradesafe_agent_token,
                role: 'AGENT',
                fee: Number(txn.commission_pct) * 100,
                feeType: 'PERCENT',
                feeAllocation: 'SELLER',
              },
            ],
          },
        },
      }
    );

    await supabaseAdmin
      .from('transactions')
      .update({
        tradesafe_transaction_id: created.transactionCreate.id,
        tradesafe_reference: created.transactionCreate.reference,
        tradesafe_allocation_id: created.transactionCreate.allocations[0]?.id ?? null,
      })
      .eq('id', txn.id);

    const depositVars = {
      id: created.transactionCreate.id,
      method: depositMethod,
      value: txn.quoted_amount,
      redirects: {
        success: `${APP_URL}/payment/success?jobId=${jobId}`,
        failure: `${APP_URL}/payment/failure?jobId=${jobId}`,
        cancel: `${APP_URL}/payment/cancel?jobId=${jobId}`,
      },
    };

    if (depositMethod === 'EFT') {
      await tradesafeRequest(
        `mutation($id: ID!, $method: DepositMethod!, $value: Float, $redirects: TransactionDepositRedirects) {
          transactionDeposit(id: $id, method: $method, value: $value, redirects: $redirects) { id }
        }`,
        depositVars
      );

      // transactionDeposit's own `calculation.eft.bankingDetails` comes back
      // null in sandbox (confirmed empirically) — the actual bank reference
      // lives on a separate query keyed by the buyer's own token, which is
      // stable for that buyer regardless of which transaction they're
      // funding. TradeSafe reconciles the incoming EFT against this
      // reference on their side; there's no redirect/paymentLink for EFT at
      // all — it's purely informational until their webhook confirms receipt.
      const details = await tradesafeRequest<{ tokenDepositDetails: { name: string; number: string; branch: string; type: string; reference: string } }>(
        `query($id: ID!) { tokenDepositDetails(id: $id) { name number branch type reference } }`,
        { id: buyerToken }
      );

      return new Response(JSON.stringify({ method: 'EFT', bankingDetails: details.tokenDepositDetails }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // OZOW: TradeSafe's own sandbox currently throws a server-side error
    // generating the Ozow payment link — confirmed directly against their
    // sandbox with the gateway enabled (create_payment_link_ozow(): Argument
    // #2 ($amount) must be of type float, string given — a bug in their own
    // PHP code, not a request-shape issue on our end). The whole mutation
    // fails, not just the paymentLink field, so there's no partial data to
    // fall back to. Surface a clear, actionable message instead of their
    // raw PHP stack trace, and leave this exact call in place — it should
    // start working the moment TradeSafe fixes it on their side.
    try {
      const deposit = await tradesafeRequest<{ transactionDeposit: { paymentLink: string | null } }>(
        `mutation($id: ID!, $method: DepositMethod!, $value: Float, $redirects: TransactionDepositRedirects) {
          transactionDeposit(id: $id, method: $method, value: $value, redirects: $redirects) { paymentLink }
        }`,
        depositVars
      );
      if (!deposit.transactionDeposit.paymentLink) throw new Error('No payment link returned');

      return new Response(JSON.stringify({ method: 'OZOW', paymentLink: deposit.transactionDeposit.paymentLink }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('Ozow deposit failed (likely a TradeSafe sandbox issue):', err);
      return new Response(JSON.stringify({ error: 'Ozow is temporarily unavailable — please use Bank Transfer (EFT) instead.' }), { status: 502 });
    }
  } catch (err) {
    console.error('tradesafe-checkout error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), { status: 500 });
  }
});
