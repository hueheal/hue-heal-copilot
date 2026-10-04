-- ============================================================================
-- Hue & Heal :: 0039 — daily Hue & Heal posts paused (founder's request, 4 Oct 2026)
-- The daily-posts-8am cron is deactivated, not removed: its command holds the
-- shared cron secret that later migrations read. To resume:
--   select cron.alter_job(jobid, active := true) from cron.job where jobname = 'daily-posts-8am';
-- ============================================================================
select cron.alter_job(jobid, active := false) from cron.job where jobname = 'daily-posts-8am';
