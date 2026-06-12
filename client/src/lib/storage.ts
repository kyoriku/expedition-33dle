import { EMPTY_STATS } from "./stats";
import type { Stats, StoredGameState } from "./types";

const keyFor = (date: string) => `expedition33dle:state:${date}`;

// Cumulative across days — intentionally NO date suffix, unlike game-state keys.
const STATS_KEY = "expedition33dle:stats";

const STATUSES = ["in_progress", "won", "lost"];

/** Read stored state for the given puzzle date. Returns null (fresh game) on
 *  missing key, corrupt JSON, unexpected shape, or disabled storage. */
export function loadState(date: string): StoredGameState | null {
  try {
    const raw = localStorage.getItem(keyFor(date));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const state = parsed as StoredGameState;
    if (
      !Array.isArray(state.guesses) ||
      !STATUSES.includes(state.status) ||
      typeof state.puzzle_number !== "number"
    ) {
      return null;
    }
    // States written before the stats feature lack the flag; false is safe.
    state.stats_recorded = state.stats_recorded === true;
    return state;
  } catch {
    return null;
  }
}

/** Persist state for the given puzzle date. Silently no-ops if storage is
 *  unavailable (e.g. private mode). */
export function saveState(date: string, state: StoredGameState): void {
  try {
    localStorage.setItem(keyFor(date), JSON.stringify(state));
  } catch {
    // ignore
  }
}

/** Read cumulative stats. Returns EMPTY_STATS on missing key, corrupt JSON,
 *  unexpected shape, or disabled storage. */
export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return EMPTY_STATS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY_STATS;
    const stats = parsed as Stats;
    if (
      typeof stats.played !== "number" ||
      typeof stats.won !== "number" ||
      typeof stats.current_streak !== "number" ||
      typeof stats.max_streak !== "number" ||
      !Array.isArray(stats.guess_distribution) ||
      stats.guess_distribution.length !== 6
    ) {
      return EMPTY_STATS;
    }
    return stats;
  } catch {
    return EMPTY_STATS;
  }
}

/** Persist cumulative stats. Silently no-ops if storage is unavailable. */
export function saveStats(stats: Stats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

// Whether the how-to-play modal has ever been dismissed (no date suffix).
const TUTORIAL_KEY = "expedition33dle:tutorial_seen";

export function loadTutorialSeen(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveTutorialSeen(): void {
  try {
    localStorage.setItem(TUTORIAL_KEY, "true");
  } catch {
    // ignore
  }
}
