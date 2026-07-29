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

/** EMPTY_STATS with an n-bucket guess distribution (n = the mode's max guesses). */
const emptyStatsFor = (n: number): Stats => ({
  ...EMPTY_STATS,
  guess_distribution: Array(n).fill(0),
});

// Classic guess cap — single source of truth (mirrors PICTOS_MAX_GUESSES below),
// shared by ClassicPage's win/lose check, the HowToPlay copy, and the menu card.
export const CLASSIC_MAX_GUESSES = 6;

// Pictos guess cap — single source of truth. Drives the win/lose check in
// PictosPage, the "in N tries" HowToPlay copy, the empty-stats bucket count, and
// the stored-stats length validation, so they can't drift.
export const PICTOS_MAX_GUESSES = 8;

export const EMPTY_PICTO_STATS: Stats = emptyStatsFor(PICTOS_MAX_GUESSES);

// Weapons guess cap — single source of truth (mirrors PICTOS_MAX_GUESSES). Drives
// the win/lose check in WeaponsPage, the HowToPlay copy, the empty-stats bucket
// count, the stored-stats length validation, and the menu card. The backend does
// NOT ship this in /today — keep it in sync with WEAPONS_MAX_GUESSES on the server.
export const WEAPONS_MAX_GUESSES = 8;

export const EMPTY_WEAPONS_STATS: Stats = emptyStatsFor(WEAPONS_MAX_GUESSES);

// Bosses guess cap — single source of truth (mirrors WEAPONS_MAX_GUESSES). Drives
// the win/lose check in BossesPage, the HowToPlay copy, the empty-stats bucket
// count, the stored-stats length validation, and the menu card. The backend does
// NOT ship this in /today — keep it in sync with BOSSES_MAX_GUESSES on the server.
export const BOSSES_MAX_GUESSES = 7;

export const EMPTY_BOSSES_STATS: Stats = emptyStatsFor(BOSSES_MAX_GUESSES);

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
