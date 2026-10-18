-- Daily 17:00 SAST (15:00 UTC) alert: if any tradie documents or reward
-- slips arrived today and are still awaiting a decision, email the admin a
-- summary via the daily-review-digest edge function. That function is
-- deployed with --no-verify-jwt (same as tradesafe-webhook) since pg_cron
-- has no user JWT to present — it authenticates instead with a shared
-- secret read from Vault below, so the secret value never appears in this
-- file or git history. The secret itself is created once, out-of-band:
--   select vault.create_secret('<value>', 'daily_digest_secret');
-- (same value set as the DAILY_DIGEST_SECRET function secret via
-- `supabase secrets set`).
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'daily-review-digest',
  '0 15 * * *',
  $$
  select net.http_post(
    url := 'https://agfzfgftpikfgwfscrgb.supabase.co/functions/v1/daily-review-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-digest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'daily_digest_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
