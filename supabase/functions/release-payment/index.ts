import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  const { payment_id, job_id } = await req.json();

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (!user) return new Response('Unauthorized', { status: 401 });

  // Validate ownership
  const { data: payment } = await supabase
    .from('payments')
    .select('*, job:jobs(status)')
    .eq('id', payment_id)
    .single();

  if (!payment || payment.customer_id !== user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  if (payment.status !== 'held_in_escrow') {
    return new Response('Payment not in escrow', { status: 400 });
  }

  // Get tradie bank details
  const { data: tradie } = await supabase
    .from('profiles')
    .select('bank_name, bank_account_number, bank_branch_code, bank_account_type, full_name')
    .eq('id', payment.tradie_id)
    .single();

  const now = new Date().toISOString();

  // Release payment
  await supabase
    .from('payments')
    .update({ status: 'released', released_at: now })
    .eq('id', payment_id);

  // Update job status
  await supabase
    .from('jobs')
    .update({ status: 'completed' })
    .eq('id', job_id);

  // Add to pending payouts queue (admin processes EFT)
  await supabase.from('pending_payouts').insert({
    payment_id,
    tradie_id: payment.tradie_id,
    amount: payment.tradie_payout,
    bank_name: tradie?.bank_name,
    bank_account: tradie?.bank_account_number,
    branch_code: tradie?.bank_branch_code,
    account_type: tradie?.bank_account_type,
    is_processed: false,
  });

  // Notify tradie
  await supabase.functions.invoke('send-push-notification', {
    body: {
      user_id: payment.tradie_id,
      title: '💰 Payment Released!',
      body: `R${payment.tradie_payout.toFixed(2)} is being transferred to your bank account.`,
      data: { job_id, type: 'payment_released' },
    },
  });

  // Notify customer to rate
  await supabase.from('notifications').insert({
    user_id: payment.customer_id,
    type: 'job_completed',
    title: '⭐ Rate your tradie',
    body: 'How did the job go? Leave a review for your tradie.',
    data: { job_id },
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
