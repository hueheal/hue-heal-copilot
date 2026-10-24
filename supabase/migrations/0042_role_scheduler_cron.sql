-- ============================================================================
-- Hue & Heal :: 0042 — the role scheduler gets its own daily cron
-- role-scheduler (standing tasks, Friday digests, Friday retros) used to be
-- chained off daily-posts. When daily-posts was paused on 4 Oct 2026 (0039),
-- the roles' scheduled work stopped with it. It now runs on its own at 07:00
-- UTC, as before. The shared secret is read from the paused daily-posts cron,
-- which is why that job is kept (inactive) rather than removed.
-- ============================================================================
do $$
declare cmd text; secret text; base text;
begin
  select command into cmd from cron.job where jobname = 'daily-posts-8am';
  secret := substring(cmd from 'x-cron-secret''\s*,\s*''([^'']+)''');
  base := substring(cmd from '(https://[^'']+/functions/v1/)');
  if secret is null or base is null then raise notice 'schedule role-scheduler-daily by hand'; return; end if;
  perform cron.unschedule(jobname) from cron.job where jobname = 'role-scheduler-daily';
  perform cron.schedule('role-scheduler-daily', '0 7 * * *',
    format('select net.http_post(url := %L, headers := jsonb_build_object(%L, %L, %L, %L), body := %L::jsonb)',
      base || 'role-scheduler', 'content-type', 'application/json', 'x-cron-secret', secret, '{}'));
end $$;
