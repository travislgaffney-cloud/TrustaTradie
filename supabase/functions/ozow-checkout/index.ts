import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createOzowPayment } from '../_shared/ozow.ts';
import { checkRateLimit, rateLimitResponse, getClientIp } from '../_shared/rate-limit.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const VERIFICATION_FEE = 100.00;
const ID_NUMBER_PATTERN = /^\d{13}$/;

Deno.serve(async (req) => {
  try {
    const ip = getClientIp(req);
    const ipLimit = await checkRateLimit(supabaseAdmin, `ip:${ip}:ozow-checkout`, { limit: 20, windowSeconds: 300 });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSeconds);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const userLimit = await checkRateLimit(supabaseAdmin, `user:${caller.id}:ozow-checkout`, { limit: 5, windowSeconds: 300 });
    if (!userLimit.allowed) return rateLimitResponse(userLimit.retryAfterSeconds);

    const { idNumber, cipcNumber } = (await req.json()) as { idNumber: string; cipcNumber?: string };

    if (!idNumber || !ID_NUMBER_PATTERN.test(idNumber)) {
      return new Response(JSON.stringify({ error: 'Enter a valid 13-digit SA ID number' }), { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name, bank_name, bank_account_number, bank_branch_code, bank_account_type')
      .eq('id', caller.id)
      .single();

    if (!profile || profile.role !== 'tradie') {
      return new Response(JSON.stringify({ error: 'Only tradie accounts can apply for verification' }), { status: 403 });
    }
    if (!profile.bank_account_number || !profile.bank_name || !profile.bank_branch_code) {
      return new Response(JSON.stringify({ error: 'Add your bank details first (Profile → Earnings → Bank Details)' }), { status: 409 });
    }

    const { data: tradieProfile } = await supabaseAdmin
      .from('tradie_profiles')
      .select('cipc_number')
      .eq('id', caller.id)
      .single();

    const resolvedCipc = cipcNumber?.trim() || tradieProfile?.cipc_number;
    if (!resolvedCipc) {
      return new Response(JSON.stringify({ error: 'A CIPC registration number is required to get verified' }), { status: 400 });
    }
    if (cipcNumber?.trim() && cipcNumber.trim() !== tradieProfile?.cipc_number) {
      await supabaseAdmin.from('tradie_profiles').update({ cipc_number: cipcNumber.trim() }).eq('id', caller.id);
    }

    // Block a second in-flight attempt rather than letting someone pay twice.
    const { data: existing } = await supabaseAdmin
      .from('tradie_verifications')
      .select('id, status')
      .eq('tradie_id', caller.id)
      .in('status', ['pending_payment', 'paid', 'checking'])
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: 'You already have a verification attempt in progress', verificationId: existing.id }), { status: 409 });
    }

    const { data: verification, error: insertError } = await supabaseAdmin
      .from('tradie_verifications')
      .insert({ tradie_id: caller.id, id_number: idNumber, amount: VERIFICATION_FEE, status: 'pending_payment' })
      .select('id')
      .single();

    if (insertError || !verification) {
      console.error('Failed to create tradie_verifications row:', insertError);
      return new Response(JSON.stringify({ error: 'Could not start verification' }), { status: 500 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    let payment;
    try {
      payment = await createOzowPayment({
        verificationId: verification.id,
        amount: VERIFICATION_FEE,
        returnUrl: 'trustatradie://verification/return',
        notifyUrl: `${supabaseUrl}/functions/v1/ozow-webhook`,
      });
    } catch (err) {
      console.error('Ozow payment creation failed:', err);
      await supabaseAdmin.from('tradie_verifications').delete().eq('id', verification.id);
      return new Response(JSON.stringify({ error: 'Could not start payment — please try again' }), { status: 502 });
    }

    await supabaseAdmin
      .from('tradie_verifications')
      .update({ ozow_payment_id: payment.id, ozow_payment_status: payment.status })
      .eq('id', verification.id);

    return new Response(JSON.stringify({ verificationId: verification.id, redirectUrl: payment.redirectUrl }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('ozow-checkout error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), { status: 500 });
  }
});
