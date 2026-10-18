import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse, getClientIp } from '../_shared/rate-limit.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Self-service account deletion: anonymizes personal info and permanently locks
// the login, but deliberately keeps jobs/quotes/transactions/payments/invoices/
// ratings/messages intact — those are the OTHER party's records too, and tax law
// requires retaining financial records regardless of an erasure request.
const FOLDERED_PII_BUCKETS = ['documents', 'portfolio', 'completion-photos'] as const;

Deno.serve(async (req) => {
  // IP check first, before auth — this is the only thing standing between
  // an attacker and an unlimited number of bearer-token guesses.
  const ip = getClientIp(req);
  const ipLimit = await checkRateLimit(supabaseAdmin, `ip:${ip}:delete-account`, { limit: 10, windowSeconds: 3600 });
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSeconds);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
  if (!user) return new Response('Unauthorized', { status: 401 });

  const userId = user.id;

  // This should basically never fire for a real user — deleting your
  // account is a one-time action. Tight on purpose, pure abuse protection.
  const userLimit = await checkRateLimit(supabaseAdmin, `user:${userId}:delete-account`, { limit: 3, windowSeconds: 3600 });
  if (!userLimit.allowed) return rateLimitResponse(userLimit.retryAfterSeconds);

  // 1. Remove PII-bearing storage files
  for (const bucket of FOLDERED_PII_BUCKETS) {
    const { data: files } = await supabaseAdmin.storage.from(bucket).list(userId);
    if (files && files.length > 0) {
      await supabaseAdmin.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`));
    }
  }
  // avatars are flat filenames (`{userId}.{ext}`), not foldered
  const { data: avatarFiles } = await supabaseAdmin.storage.from('avatars').list('', { search: userId });
  if (avatarFiles && avatarFiles.length > 0) {
    await supabaseAdmin.storage.from('avatars').remove(avatarFiles.map((f) => f.name));
  }

  // 2. Delete rows that are purely personal (not needed for the other party's record)
  await supabaseAdmin.from('tradie_documents').delete().eq('tradie_id', userId);
  await supabaseAdmin.from('portfolio_images').delete().eq('tradie_id', userId);

  // 3. Anonymize the profile — kept (not deleted) so historical jobs/transactions
  //    the other party relies on still resolve to a valid (now-anonymous) profile.
  await supabaseAdmin.from('profiles').update({
    full_name: 'Deleted User',
    avatar_url: null,
    phone: null,
    bio: null,
    location: null,
    address_text: null,
    suburb: null,
    province: null,
    push_token: null,
    bank_name: null,
    bank_account_number: null,
    bank_branch_code: null,
    bank_account_type: null,
    is_suspended: true,
  }).eq('id', userId);

  // 4. Strip tradie-specific business/identifying fields
  await supabaseAdmin.from('tradie_profiles').update({
    cipc_number: null,
    vat_number: null,
    hourly_rate: null,
  }).eq('id', userId);

  // 5. Permanently lock the login: scrub the identity used to sign in, ban indefinitely
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    email: `deleted-${userId}@trustatradie.invalid`,
    user_metadata: {},
    ban_duration: '876000h', // ~100 years — Supabase has no literal "permanent"
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
