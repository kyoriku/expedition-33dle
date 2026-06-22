import {
  EMPTY_PICTO_STATS,
  EMPTY_STATS,
  EMPTY_WEAPONS_STATS,
  PICTOS_MAX_GUESSES,
  WEAPONS_MAX_GUESSES,
} from "./stats";
import type {
  PictoStoredGameState,
  Stats,
  StoredGameState,
  WeaponStoredGameState,
} from "./types";

const keyFor = (date: string) => `expedition33dle:classic:state:${date}`;

// Cumulative across days — intentionally NO date suffix, unlike game-state keys.
const STATS_KEY = "expedition33dle:classic:stats";

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

// Pictos game state — separate namespace from classic so the two modes' daily
// state never collide.
const pictosKeyFor = (date: string) => `expedition33dle:pictos:state:${date}`;

/** Read stored pictos state for the given puzzle date. Returns null (fresh game)
 *  on missing key, corrupt JSON, unexpected shape, or disabled storage. */
export function loadPictosState(date: string): PictoStoredGameState | null {
  try {
    const raw = localStorage.getItem(pictosKeyFor(date));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const state = parsed as PictoStoredGameState;
    if (
      !Array.isArray(state.guesses) ||
      !STATUSES.includes(state.status) ||
      typeof state.puzzle_number !== "number"
    ) {
      return null;
    }
    // States written before stats tracking lack the flag; false is safe.
    state.stats_recorded = state.stats_recorded === true;
    return state;
  } catch {
    return null;
  }
}

/** Persist pictos state for the given puzzle date. Silently no-ops if storage is
 *  unavailable. */
export function savePictosState(date: string, state: PictoStoredGameState): void {
  try {
    localStorage.setItem(pictosKeyFor(date), JSON.stringify(state));
  } catch {
    // ignore
  }
}

// Weapons game state — separate namespace from classic/pictos so the modes' daily
// state never collide.
const weaponsKeyFor = (date: string) => `expedition33dle:weapons:state:${date}`;

/** Read stored weapons state for the given puzzle date. Returns null (fresh game)
 *  on missing key, corrupt JSON, unexpected shape, or disabled storage. */
export function loadWeaponsState(date: string): WeaponStoredGameState | null {
  try {
    const raw = localStorage.getItem(weaponsKeyFor(date));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const state = parsed as WeaponStoredGameState;
    if (
      !Array.isArray(state.guesses) ||
      !STATUSES.includes(state.status) ||
      typeof state.puzzle_number !== "number"
    ) {
      return null;
    }
    // States written before stats tracking lack the flag; false is safe.
    state.stats_recorded = state.stats_recorded === true;
    return state;
  } catch {
    return null;
  }
}

/** Persist weapons state for the given puzzle date. Silently no-ops if storage is
 *  unavailable. */
export function saveWeaponsState(date: string, state: WeaponStoredGameState): void {
  try {
    localStorage.setItem(weaponsKeyFor(date), JSON.stringify(state));
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

// Pictos cumulative stats — separate namespace from classic; independent totals.
const PICTOS_STATS_KEY = "expedition33dle:pictos:stats";

/** Read cumulative pictos stats. Returns EMPTY_PICTO_STATS on missing key,
 *  corrupt JSON, unexpected shape, or disabled storage. */
export function loadPictosStats(): Stats {
  try {
    const raw = localStorage.getItem(PICTOS_STATS_KEY);
    if (!raw) return EMPTY_PICTO_STATS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY_PICTO_STATS;
    const stats = parsed as Stats;
    if (
      typeof stats.played !== "number" ||
      typeof stats.won !== "number" ||
      typeof stats.current_streak !== "number" ||
      typeof stats.max_streak !== "number" ||
      !Array.isArray(stats.guess_distribution) ||
      stats.guess_distribution.length !== PICTOS_MAX_GUESSES
    ) {
      return EMPTY_PICTO_STATS;
    }
    return stats;
  } catch {
    return EMPTY_PICTO_STATS;
  }
}

/** Persist cumulative pictos stats. Silently no-ops if storage is unavailable. */
export function savePictosStats(stats: Stats): void {
  try {
    localStorage.setItem(PICTOS_STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

// Weapons cumulative stats — separate namespace from classic/pictos; independent totals.
const WEAPONS_STATS_KEY = "expedition33dle:weapons:stats";

/** Read cumulative weapons stats. Returns EMPTY_WEAPONS_STATS on missing key,
 *  corrupt JSON, unexpected shape, or disabled storage. */
export function loadWeaponsStats(): Stats {
  try {
    const raw = localStorage.getItem(WEAPONS_STATS_KEY);
    if (!raw) return EMPTY_WEAPONS_STATS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY_WEAPONS_STATS;
    const stats = parsed as Stats;
    if (
      typeof stats.played !== "number" ||
      typeof stats.won !== "number" ||
      typeof stats.current_streak !== "number" ||
      typeof stats.max_streak !== "number" ||
      !Array.isArray(stats.guess_distribution) ||
      stats.guess_distribution.length !== WEAPONS_MAX_GUESSES
    ) {
      return EMPTY_WEAPONS_STATS;
    }
    return stats;
  } catch {
    return EMPTY_WEAPONS_STATS;
  }
}

/** Persist cumulative weapons stats. Silently no-ops if storage is unavailable. */
export function saveWeaponsStats(stats: Stats): void {
  try {
    localStorage.setItem(WEAPONS_STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

// Daily-state keys accrue one per mode per day played; prune them on boot so
// localStorage doesn't grow unbounded. ONLY :state:<date> keys are touched —
// cumulative :stats keys (and any legacy keys, like the retired :tutorial_seen
// flags) are intentionally preserved.
const STATE_PREFIXES = [
  "expedition33dle:classic:state:",
  "expedition33dle:pictos:state:",
  "expedition33dle:weapons:state:",
];

/** Delete every daily-state key whose date isn't `today` (UTC ISO, e.g.
 *  "2026-06-20"). Call once on app boot. Collect-then-delete avoids mutating
 *  localStorage mid-iteration. */
export function pruneOldDailyState(today: string): void {
  try {
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const prefix = STATE_PREFIXES.find((p) => key.startsWith(p));
      if (prefix && key.slice(prefix.length) !== today) stale.push(key);
    }
    stale.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
