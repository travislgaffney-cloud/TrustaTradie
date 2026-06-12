import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const PAYFAST_IPS = ['197.97.145.144', '197.97.145.145', '197.97.145.146', '41.74.179.194'];
const PAYFAST_SANDBOX_IPS = ['197.97.145.144'];

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('OK', { status: 200 });

  const body = await req.text();
  const params = new URLSearchParams(body);
  const data: Record<string, string> = {};
  params.forEach((v, k) => { data[k] = v; });

  const { m_payment_id, payment_status, pf_payment_id } = data;

  if (payment_status !== 'COMPLETE') {
    return new Response('Not complete', { status: 200 });
  }

  // Update payment status
  await supabase
    .from('payments')
    .update({
      status: 'held_in_escrow',
      payfast_pf_payment_id: pf_payment_id,
      paid_at: new Date().toISOString(),
    })
    .eq('id', m_payment_id);

  // Get payment details
  const { data: payment } = await supabase
    .from('payments')
    .select('job_id, tradie_id, customer_id, amount_total')
    .eq('id', m_payment_id)
    .single();

  if (payment) {
    // Update job status to in_progress
    await supabase
      .from('jobs')
      .update({ status: 'in_progress' })
      .eq('id', payment.job_id);

    // Notify tradie
    await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: payment.tradie_id,
        title: '💰 Payment Received!',
        body: `The customer has paid R${payment.amount_total}. You can start the job now.`,
        data: { job_id: payment.job_id, type: 'payment_received' },
      },
    });
  }

  return new Response('OK', { status: 200 });
});
