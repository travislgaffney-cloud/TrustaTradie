import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { tradesafeRequest } from '../_shared/tradesafe.ts';
import { checkRateLimit, rateLimitResponse, getClientIp } from '../_shared/rate-limit.ts';
import { type Action, isValidAction, isAuthorizedCaller } from './logic.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// This function is the one place that calls TradeSafe's allocation/transaction
// mutations, so the app's own buttons stay thin wrappers around it:
//   - 'start'    — tradie begins the job (allocationStartDelivery)
//   - 'complete' — tradie marks the job done (allocationCompleteDelivery)
//   - 'accept'   — customer releases payment (allocationAcceptDelivery)
//   - 'dispute'  — customer raises a dispute (allocationDisputeDelivery)
// The resulting fund movement (FUNDS_RELEASED etc.) still arrives via
// tradesafe-webhook as the source of truth for the internal ledger; this
// function only triggers the action on TradeSafe's side.
//
// Allocation lifecycle (confirmed via schema introspection + a real sandbox
// transaction, not guessed): CREATED -> [allocationStartDelivery] ->
// INITIATED -> [allocationCompleteDelivery] -> PENDING_ACCEPTANCE ->
// [allocationAcceptDelivery] marks hasAccepted=true. Funding the overall
// TRANSACTION (webhook's FUNDS_RECEIVED, our transactions.status =
// 'funds_held') similarly does NOT by itself advance the ALLOCATION past
// CREATED — there's no "funded" AllocationState at all.
//
// Actually finalizing the TRANSACTION (releasing funds) needs something
// beyond allocationAcceptDelivery — confirmed live that transaction.state
// stays INITIATED after it. The obvious next mutation, transactionAccept,
// turned out to be a dead end: it rejects with "You are not allowed to
// accept this transaction" (a Lighthouse AuthorizationException) no matter
// what, because our server-side credentials authenticate as the AGENT party,
// not the BUYER — TradeSafe requires that finalization come from the buyer's
// own authenticated context, which this app-level API client structurally
// can't provide. There's no code fix for that from our side; it needs either
// a different, buyer-authenticated flow (TradeSafe support/docs) or to stay
// out of scope while this integration runs on dummy/sandbox data. See
// 'accept' in runAccept below for how the app handles that in the meantime.
const MUTATIONS: Record<Action, string> = {
  start: `mutation($id: ID!) { allocationStartDelivery(id: $id) { id state } }`,
  complete: `mutation($id: ID!) { allocationCompleteDelivery(id: $id) { id state } }`,
  accept: `mutation($id: ID!) { allocationAcceptDelivery(id: $id) { id state } }`,
  dispute: `mutation($id: ID!, $comment: String!) { allocationDisputeDelivery(id: $id, comment: $comment) { id state } }`,
};

async function runComplete(allocationId: string): Promise<string> {
  try {
    const data = await tradesafeRequest<{ allocationCompleteDelivery: { state: string } }>(MUTATIONS.complete, { id: allocationId });
    return data.allocationCompleteDelivery.state;
  } catch (err) {
    // Self-healing: every job started before 'start' existed never called
    // allocationStartDelivery, so its allocation is stuck at CREATED and
    // 'complete' fails with this exact message. Advance it past CREATED
    // once, then retry — no need to know or track allocation state ourselves.
    const stuckAtCreated = err instanceof Error && err.message.includes('You cannot complete delivery for this allocation');
    if (!stuckAtCreated) throw err;

    await tradesafeRequest(MUTATIONS.start, { id: allocationId });
    const data = await tradesafeRequest<{ allocationCompleteDelivery: { state: string } }>(MUTATIONS.complete, { id: allocationId });
    return data.allocationCompleteDelivery.state;
  }
}

async function runAccept(allocationId: string): Promise<string> {
  try {
    const data = await tradesafeRequest<{ allocationAcceptDelivery: { state: string } }>(MUTATIONS.accept, { id: allocationId });
    return data.allocationAcceptDelivery.state;
  } catch (err) {
    // A retry after a previous attempt already got this far (hasAccepted:
    // true) hits this same rejection on every further call — that's the
    // allocation side of the job genuinely done, not a failure.
    const alreadyAccepted = err instanceof Error && err.message.includes('You cannot accept this allocation');
    if (!alreadyAccepted) throw err;
    return 'PENDING_ACCEPTANCE';
  }
}

Deno.serve(async (req) => {
  try {
    const ip = getClientIp(req);
    const ipLimit = await checkRateLimit(supabaseAdmin, `ip:${ip}:tradesafe-allocation-action`, { limit: 30, windowSeconds: 300 });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSeconds);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const userLimit = await checkRateLimit(supabaseAdmin, `user:${caller.id}:tradesafe-allocation-action`, { limit: 10, windowSeconds: 300 });
    if (!userLimit.allowed) return rateLimitResponse(userLimit.retryAfterSeconds);

    const { jobId, action, comment } = (await req.json()) as { jobId: string; action: Action; comment?: string };
    if (!jobId || !isValidAction(action)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid jobId/action' }), { status: 400 });
    }
    if (action === 'dispute' && !comment) {
      return new Response(JSON.stringify({ error: 'A comment is required to raise a dispute' }), { status: 400 });
    }

    const { data: txn } = await supabaseAdmin
      .from('transactions')
      .select('customer_id, tradie_id, tradesafe_allocation_id')
      .eq('job_id', jobId)
      .single();

    if (!txn) return new Response(JSON.stringify({ error: 'Transaction not found' }), { status: 404 });
    if (!txn.tradesafe_allocation_id) {
      return new Response(JSON.stringify({ error: 'Payment has not been initiated via TradeSafe yet' }), { status: 409 });
    }

    if (!isAuthorizedCaller(caller.id, action, txn)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    let state: string;
    if (action === 'complete') {
      state = await runComplete(txn.tradesafe_allocation_id);
    } else if (action === 'accept') {
      state = await runAccept(txn.tradesafe_allocation_id);
    } else {
      const variables: Record<string, unknown> = { id: txn.tradesafe_allocation_id };
      if (action === 'dispute') variables.comment = comment;
      const data = await tradesafeRequest<Record<string, { state: string }>>(MUTATIONS[action], variables);
      state = data[Object.keys(data)[0]].state;
    }

    return new Response(JSON.stringify({ state }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('tradesafe-allocation-action error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), { status: 500 });
  }
});
