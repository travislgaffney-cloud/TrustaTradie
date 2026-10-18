-- Fires 01:00 UTC on the 1st of every month (03:00 SAST) to generate the
-- previous month's supplier reward reports. Same no-user-JWT /
-- shared-secret-from-Vault pattern as migration 048's daily digest — the
-- secret value is created once, out-of-band:
--   select vault.create_secret('<value>', 'monthly_report_secret');
-- (same value set as the MONTHLY_REPORT_SECRET function secret via
-- `supabase secrets set`).
select cron.schedule(
  'monthly-report-generate',
  '0 1 1 * *',
  $$
  select net.http_post(
    url := 'https://agfzfgftpikfgwfscrgb.supabase.co/functions/v1/monthly-report-generate',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-digest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'monthly_report_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
