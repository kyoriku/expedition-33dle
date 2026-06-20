import { FIELD_ORDER } from "./attributes";
import type { GameStatus, ClassicGuessResponse } from "./types";

// Spoiler-free by construction: higher/lower fold into the same square as
// miss, so the grid leaks no directional info.
const EMOJI: Record<string, string> = {
  match: "🟩",
  partial: "🟨", // element only
  miss: "🟥",
  higher: "🟥",
  lower: "🟥",
};

export function buildShareString(
  guesses: ClassicGuessResponse[],
  puzzleNumber: number,
  status: GameStatus,
): string {
  const score = status === "won" ? String(guesses.length) : "X";
  // Newest-on-top to match GuessGrid (Phase 7.5c). Copy before reverse() so
  // the prop array isn't mutated.
  const grid = [...guesses]
    .reverse()
    .map((g) => FIELD_ORDER.map((f) => EMOJI[g.feedback[f]]).join(""))
    .join("\n");
  return `Expedition 33dle #${puzzleNumber} ${score}/6\n\n${grid}\n\nhttps://expedition33dle.com`;
}

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

export async function shareResult(text: string): Promise<ShareResult> {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return "cancelled";
      }
      // Other errors fall through to clipboard
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
