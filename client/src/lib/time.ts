// Daily-rollover time helpers. The puzzle rolls at 00:00 UTC server-side
// (see server/app/routers/classic.py), so everything here is UTC-based to stay
// in lock-step with the server's notion of "today". Pure + injectable `now`
// for testability.

/** Milliseconds from `now` until the next 00:00 UTC (when the daily puzzle rolls). */
export function msToNextUtcMidnight(now: Date = new Date()): number {
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return next - now.getTime();
}

/** Current UTC date as YYYY-MM-DD — matches the server's `puzzle_date`. */
export function todayUtcISO(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Format a millisecond duration as HH:MM:SS (clamped at zero). */
export function formatHMS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}
