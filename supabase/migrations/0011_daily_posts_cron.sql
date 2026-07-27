-- ============================================================================
-- Hue & Heal :: migration 0011
-- Schedule the daily "3 posts for today" email. Runs the daily-posts edge
-- function every morning via pg_cron + pg_net.
--
-- Runs at 07:00 UTC = 08:00 UK during British Summer Time. When the clocks go
-- back (late October) change the hour to '0 8 * * *' to stay at 08:00 UK.
--
-- SECRET: replace <CRON_SECRET> below with the value of the function's
-- CRON_SECRET before running (kept out of git on purpose). Run in the
-- Supabase SQL editor.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove any previous version of the job (safe if it does not exist yet).
select cron.unschedule(jobid) from cron.job where jobname = 'daily-posts-8am';

select cron.schedule(
  'daily-posts-8am',
  '0 7 * * *',
  $$
  select net.http_post(
    url     := 'https://dxniwcwoacyrjlyhymoh.supabase.co/functions/v1/daily-posts',
    headers := jsonb_build_object('content-type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
    body    := '{}'::jsonb
  );
  $$
);
