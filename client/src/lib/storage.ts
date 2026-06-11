import type { StoredGameState } from "./types";

const keyFor = (date: string) => `expedition33dle:state:${date}`;

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
