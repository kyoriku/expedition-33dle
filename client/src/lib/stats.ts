import type { Stats } from "./types";

export const EMPTY_STATS: Stats = {
  played: 0,
  won: 0,
  current_streak: 0,
  max_streak: 0,
  guess_distribution: [0, 0, 0, 0, 0, 0],
  last_played_puzzle_number: null,
  last_played_date: null,
};

/** True when `today` is exactly one calendar day after `prev` (both YYYY-MM-DD, UTC). */
export function isPreviousDay(today: string, prev: string): boolean {
  const t = new Date(today + "T00:00:00Z");
  const p = new Date(prev + "T00:00:00Z");
  return t.getTime() - p.getTime() === 86_400_000;
}

/** Fold a finished game into cumulative stats. Pure — the call site is
 *  responsible for the stats_recorded idempotency check. */
export function recordGame(
  stats: Stats,
  result: {
    puzzle_number: number;
    puzzle_date: string; // ISO date from today.puzzle_date
    status: "won" | "lost";
    guess_count: number;
  },
): Stats {
  const next: Stats = { ...stats, guess_distribution: [...stats.guess_distribution] };
  next.played += 1;

  if (result.status === "won") {
    next.won += 1;
    next.guess_distribution[result.guess_count - 1] += 1;
    // Streak continues only when the previous game was exactly yesterday;
    // a missed day (or first game ever) restarts it at this win.
    next.current_streak =
      stats.last_played_date && isPreviousDay(result.puzzle_date, stats.last_played_date)
        ? stats.current_streak + 1
        : 1;
    next.max_streak = Math.max(stats.max_streak, next.current_streak);
  } else {
    next.current_streak = 0; // loss resets; max preserved
  }

  next.last_played_puzzle_number = result.puzzle_number;
  next.last_played_date = result.puzzle_date;
  return next;
}
