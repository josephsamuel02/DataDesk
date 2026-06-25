// ─── Nigeria-time helpers (UTC+1, no DST) ───────────────────────────────────
// All daily resets and "day" boundaries use the Nigeria calendar date so the
// client and the Postgres functions (which use the Africa/Lagos timezone) agree.

const NIGERIA_OFFSET_MS = 60 * 60 * 1000; // UTC+1

/** Returns the Nigeria calendar date as 'YYYY-MM-DD'. */
export function getNigeriaDateString(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() + NIGERIA_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** True if the two instants fall on different Nigeria calendar dates. */
export function isDifferentNigeriaDay(a: Date, b: Date): boolean {
  return getNigeriaDateString(a) !== getNigeriaDateString(b);
}

/** Whole-day difference (b - a) measured by Nigeria calendar dates. */
export function nigeriaDayDiff(a: Date, b: Date): number {
  const da = new Date(`${getNigeriaDateString(a)}T00:00:00Z`).getTime();
  const db = new Date(`${getNigeriaDateString(b)}T00:00:00Z`).getTime();
  return Math.round((db - da) / (24 * 60 * 60 * 1000));
}
