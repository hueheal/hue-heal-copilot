-- ============================================================================
-- Hue & Heal :: 0038 — the daily radar scan moves to the founder's Mac
-- The scan now runs once a day (06:30) as a scheduled Claude task on her Mac,
-- through scripts/radar-local.mjs, so it comes out of her Claude plan rather
-- than per-use API billing. The cloud schedules are removed; radar-tick stays
-- so the app's "Scan now" (a paid, on-demand cloud scan) still works.
-- To turn the cloud scan back on, re-run the radar-morning block from 0037.
-- ============================================================================
select cron.unschedule(jobname) from cron.job where jobname in ('radar-morning', 'radar-afternoon');
