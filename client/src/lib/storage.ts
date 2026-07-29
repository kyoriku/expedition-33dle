import {
  BOSSES_MAX_GUESSES,
  CLASSIC_MAX_GUESSES,
  EMPTY_BOSSES_STATS,
  EMPTY_PICTO_STATS,
  EMPTY_STATS,
  EMPTY_WEAPONS_STATS,
  PICTOS_MAX_GUESSES,
  WEAPONS_MAX_GUESSES,
} from "./stats";
import type {
  BossStoredGameState,
  PictoStoredGameState,
  Stats,
  StoredGameState,
  WeaponStoredGameState,
} from "./types";

const STATUSES = ["in_progress", "won", "lost"];

/** Common shape of every mode's stored daily state — the fields loadState validates. */
interface StoredGameLike {
  guesses: unknown[];
  status: string;
  puzzle_number: number;
  stats_recorded: boolean;
}

/** Build one mode's localStorage accessors. The mode `name` is the ONLY thing in
 *  the key strings, so `expedition33dle:${name}:state:${date}` and `:stats` stay
 *  byte-identical to the hand-written per-mode keys. `maxGuesses` gates the
 *  stored-stats distribution length; `emptyStats` is the fallback returned on a
 *  miss/corruption. Each mode gets its own namespace so daily state never collides. */
function makeModeStorage<TState extends StoredGameLike>(
  name: string,
  maxGuesses: number,
  emptyStats: Stats,
) {
  const statePrefix = `expedition33dle:${name}:state:`;
  const keyFor = (date: string) => `${statePrefix}${date}`;
  const statsKey = `expedition33dle:${name}:stats`;

  /** Read stored state for the given puzzle date. Returns null (fresh game) on
   *  missing key, corrupt JSON, unexpected shape, or disabled storage. */
  function loadState(date: string): TState | null {
    try {
      const raw = localStorage.getItem(keyFor(date));
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) return null;
      const state = parsed as TState;
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

  /** Persist state for the given puzzle date. Silently no-ops if storage is
   *  unavailable (e.g. private mode). */
  function saveState(date: string, state: TState): void {
    try {
      localStorage.setItem(keyFor(date), JSON.stringify(state));
    } catch {
      // ignore
    }
  }

  /** Read cumulative stats. Returns emptyStats on missing key, corrupt JSON,
   *  unexpected shape, or disabled storage. */
  function loadStats(): Stats {
    try {
      const raw = localStorage.getItem(statsKey);
      if (!raw) return emptyStats;
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) return emptyStats;
      const stats = parsed as Stats;
      if (
        typeof stats.played !== "number" ||
        typeof stats.won !== "number" ||
        typeof stats.current_streak !== "number" ||
        typeof stats.max_streak !== "number" ||
        !Array.isArray(stats.guess_distribution) ||
        stats.guess_distribution.length !== maxGuesses
      ) {
        return emptyStats;
      }
      return stats;
    } catch {
      return emptyStats;
    }
  }

  /** Persist cumulative stats. Silently no-ops if storage is unavailable. */
  function saveStats(stats: Stats): void {
    try {
      localStorage.setItem(statsKey, JSON.stringify(stats));
    } catch {
      // ignore
    }
  }

  return { keyFor, statePrefix, statsKey, loadState, saveState, loadStats, saveStats };
}

// One isolated namespace per mode; the public functions below keep their original
// names so every call site is unchanged.
const classic = makeModeStorage<StoredGameState>("classic", CLASSIC_MAX_GUESSES, EMPTY_STATS);
const pictos = makeModeStorage<PictoStoredGameState>("pictos", PICTOS_MAX_GUESSES, EMPTY_PICTO_STATS);
const weapons = makeModeStorage<WeaponStoredGameState>("weapons", WEAPONS_MAX_GUESSES, EMPTY_WEAPONS_STATS);
const bosses = makeModeStorage<BossStoredGameState>("bosses", BOSSES_MAX_GUESSES, EMPTY_BOSSES_STATS);

export const { loadState, saveState, loadStats, saveStats } = classic;
export const {
  loadState: loadPictosState,
  saveState: savePictosState,
  loadStats: loadPictosStats,
  saveStats: savePictosStats,
} = pictos;
export const {
  loadState: loadWeaponsState,
  saveState: saveWeaponsState,
  loadStats: loadWeaponsStats,
  saveStats: saveWeaponsStats,
} = weapons;
export const {
  loadState: loadBossesState,
  saveState: saveBossesState,
  loadStats: loadBossesStats,
  saveStats: saveBossesStats,
} = bosses;

// Daily-state keys accrue one per mode per day played; prune them on boot so
// localStorage doesn't grow unbounded. ONLY :state:<date> keys are touched —
// cumulative :stats keys (and any legacy keys, like the retired :tutorial_seen
// flags) are intentionally preserved.
const STATE_PREFIXES = [
  classic.statePrefix,
  pictos.statePrefix,
  weapons.statePrefix,
  bosses.statePrefix,
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
