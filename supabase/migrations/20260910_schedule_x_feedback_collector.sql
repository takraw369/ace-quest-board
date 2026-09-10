-- Reality Loop: invoke x-feedback-collector hourly.
-- The edge function independently decides whether a 1h/24h/72h/7d window is due,
-- so the cron remains provider-neutral and does not publish or mutate content.

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'x-feedback-collector-hourly'
  order by jobid desc
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end $$;

select cron.schedule(
  'x-feedback-collector-hourly',
  '7 * * * *',
  $job$
  select net.http_post(
    url := 'https://qydbtholbwbuwiswmqsr.supabase.co/functions/v1/x-feedback-collector',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-masa-cron-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'masa_daily_cron_secret'
        order by created_at desc
        limit 1
      ),
      'x-automation-source', 'supabase_cron'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $job$
);