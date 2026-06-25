-- ─────────────────────────────────────────────────────────────────────────────
-- Data Desk — 28-hour retention for points-earned records
-- Deletes rows from points_transactions older than 28 hours. This is a HISTORY
-- cleanup only: the user's spendable balance lives in profiles.points and is
-- NOT affected by this purge.
--
-- Runs server-side on a schedule via pg_cron (works even when the app is closed).
-- pg_cron must be enabled for the project (Dashboard → Database → Extensions,
-- or the CREATE EXTENSION statement below).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cleanup routine: drop any points-earned record older than 28 hours.
CREATE OR REPLACE FUNCTION public.purge_old_points_transactions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.points_transactions
  WHERE watched_at < now() - interval '28 hours';
$$;

-- (Re)schedule the hourly job idempotently.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-old-points-transactions') THEN
    PERFORM cron.unschedule('purge-old-points-transactions');
  END IF;

  PERFORM cron.schedule(
    'purge-old-points-transactions',
    '0 * * * *',  -- top of every hour
    $cron$ SELECT public.purge_old_points_transactions(); $cron$
  );
END $$;
