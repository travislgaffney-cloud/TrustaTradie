import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyOzowWebhookSignature } from '../_shared/ozow.ts';
import { verifyIdNumber, verifyCipcNumber, verifyBankAccount } from '../_shared/verifynow.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts[0] || fullName, surname: parts.slice(1).join(' ') || parts[0] || fullName };
}

async function runVerificationChecks(verificationId: string) {
  const { data: verification } = await supabaseAdmin
    .from('tradie_verifications')
    .select('id, tradie_id, id_number')
    .eq('id', verificationId)
    .single();
  if (!verification) {
    console.error('runVerificationChecks: verification row not found', verificationId);
    return;
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, bank_name, bank_account_number, bank_branch_code, bank_account_type')
    .eq('id', verification.tradie_id)
    .single();
  const { data: tradieProfile } = await supabaseAdmin
    .from('tradie_profiles')
    .select('cipc_number')
    .eq('id', verification.tradie_id)
    .single();

  if (!profile || !tradieProfile?.cipc_number) {
    console.error('runVerificationChecks: missing profile/CIPC data', verification.tradie_id);
    await supabaseAdmin.from('tradie_verifications').update({ status: 'failed' }).eq('id', verificationId);
    return;
  }

  await supabaseAdmin.from('tradie_verifications').update({ status: 'checking' }).eq('id', verificationId);

  const { firstName, surname } = splitName(profile.full_name);

  const [idResult, cipcResult, bankResult] = await Promise.all([
    verifyIdNumber(verification.id_number, `${verificationId}:id`),
    verifyCipcNumber(tradieProfile.cipc_number, `${verificationId}:cipc`),
    verifyBankAccount({
      firstName,
      surname,
      idNumber: verification.id_number,
      bankValue: profile.bank_name,
      bankAccountNumber: profile.bank_account_number!,
      bankBranchCode: profile.bank_branch_code!,
      bankAccountType: profile.bank_account_type,
    }, `${verificationId}:bank`),
  ]);

  const allPassed = idResult.passed && cipcResult.passed && bankResult.passed;

  await supabaseAdmin
    .from('tradie_verifications')
    .update({
      id_check_result: idResult.raw,
      id_check_passed: idResult.passed,
      cipc_check_result: cipcResult.raw,
      cipc_check_passed: cipcResult.passed,
      bank_check_result: bankResult.raw,
      bank_check_passed: bankResult.passed,
      status: allPassed ? 'passed' : 'failed',
    })
    .eq('id', verificationId);

  if (allPassed) {
    await supabaseAdmin.from('tradie_profiles').update({ is_verified: true }).eq('id', verification.tradie_id);
  }
}

Deno.serve(async (req) => {
  const rawBody = await req.text();

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response(JSON.stringify({ error: 'Missing signature headers' }), { status: 400 });
  }

  const valid = await verifyOzowWebhookSignature({ rawBody, svixId, svixTimestamp, svixSignature });
  if (!valid) {
    console.error('ozow-webhook: invalid signature');
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
  }

  let event: { type: string; data: { id: string; status: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  // We only act on payment completion; ignore refund/subscription events —
  // this webhook endpoint is solely for the verification fee.
  if (event.type !== 'transaction.complete') {
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  try {
    const { data: verification } = await supabaseAdmin
      .from('tradie_verifications')
      .select('id, status')
      .eq('ozow_payment_id', event.data.id)
      .maybeSingle();

    if (!verification) {
      console.error('ozow-webhook: no verification row for payment', event.data.id);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    if (event.data.status === 'Successful') {
      // Idempotency: Ozow retries webhooks on a schedule if we don't ack
      // fast enough, and the same event can arrive twice, potentially
      // concurrently. An atomic conditional update (rather than a plain
      // check-then-write) means only one concurrent request can actually
      // win the 'pending_payment' -> 'paid' transition and go on to run
      // (and get billed for) the VerifyNow checks.
      const { data: claimed } = await supabaseAdmin
        .from('tradie_verifications')
        .update({ ozow_payment_status: event.data.status, status: 'paid' })
        .eq('id', verification.id)
        .eq('status', 'pending_payment')
        .select('id');

      if (claimed && claimed.length > 0) {
        await runVerificationChecks(verification.id);
      }
    } else if (event.data.status === 'Error') {
      // Nothing was charged — clear the attempt so the tradie can cleanly
      // retry instead of being stuck behind the "one in-flight attempt"
      // check in ozow-checkout.
      await supabaseAdmin.from('tradie_verifications').delete().eq('id', verification.id);
    } else {
      await supabaseAdmin
        .from('tradie_verifications')
        .update({ ozow_payment_status: event.data.status })
        .eq('id', verification.id);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error('ozow-webhook error:', err);
    // Still ack with 200 — VerifyNow calls may have partially succeeded and
    // partially been recorded; returning an error here would make Ozow
    // retry the whole webhook, double-running checks we already paid for.
    // The verification row is left in 'paid'/'checking' for manual review
    // if something genuinely broke mid-check.
    return new Response(JSON.stringify({ received: true, warning: 'processed with errors' }), { status: 200 });
  }
});
