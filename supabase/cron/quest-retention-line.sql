-- 20:10 JST = 11:10 UTC
select cron.schedule(
  'quest-retention-line-2010-jst',
  '10 11 * * *',
  $$
  select net.http_post(
    url := 'https://qydbtholbwbuwiswmqsr.supabase.co/functions/v1/quest-retention-line',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-masa-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'masa_daily_cron_secret' order by created_at desc limit 1),
      'x-automation-source', 'supabase_cron'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
