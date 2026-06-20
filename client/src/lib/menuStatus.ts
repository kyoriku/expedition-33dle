import type { PictoStoredGameState, Stats, StoredGameState } from "./types";

export interface MenuStatus {
  /** One-line summary for the mode's menu card. */
  text: string;
}

/** Derive a mode's menu-card status from its stored daily state and cumulative
 *  stats. Pure — both inputs come from localStorage, read once on the menu. */
export function formatMenuStatus(
  state: StoredGameState | PictoStoredGameState | null,
  stats: Stats,
  maxGuesses: number,
): MenuStatus {
  if (!state) {
    return {
      text:
        stats.current_streak > 0
          ? `Not yet played · Streak: ${stats.current_streak}`
          : "Not yet played",
    };
  }
  const used = state.guesses.length;
  switch (state.status) {
    case "won":
      return { text: `Won in ${used}/${maxGuesses} ✓ · Streak: ${stats.current_streak}` };
    case "lost":
      return { text: "Lost today" };
    default: // "in_progress"
      return { text: `In progress · ${used}/${maxGuesses} guesses used` };
  }
}
