import { FIELD_ORDER, PICTOS_FIELD_ORDER, WEAPONS_FIELD_ORDER } from "./attributes";
import { PICTOS_MAX_GUESSES, WEAPONS_MAX_GUESSES } from "./stats";
import type {
  GameStatus,
  ClassicGuessResponse,
  PictoGuessResponse,
  WeaponGuessResponse,
} from "./types";

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
  // Oldest-on-top, newest at the bottom — matches the on-screen grid order.
  const grid = guesses
    .map((g) => FIELD_ORDER.map((f) => EMOJI[g.feedback[f]]).join(""))
    .join("\n");
  return `Expedition 33dle Classic #${puzzleNumber} ${score}/6\n\n${grid}\n\nhttps://expedition33dle.com/classic`;
}

export function buildPictosShareString(
  guesses: PictoGuessResponse[],
  puzzleNumber: number,
  status: GameStatus,
): string {
  const score = status === "won" ? String(guesses.length) : "X";
  // Oldest-on-top, newest at the bottom — matches the on-screen grid order.
  const grid = guesses
    .map((g) => PICTOS_FIELD_ORDER.map((f) => EMOJI[g.feedback[f]]).join(""))
    .join("\n");
  // "Pictos" labels the mode; URL points recipients at /pictos.
  return `Expedition 33dle Pictos #${puzzleNumber} ${score}/${PICTOS_MAX_GUESSES}\n\n${grid}\n\nhttps://expedition33dle.com/pictos`;
}

export function buildWeaponsShareString(
  guesses: WeaponGuessResponse[],
  puzzleNumber: number,
  status: GameStatus,
): string {
  const score = status === "won" ? String(guesses.length) : "X";
  // Oldest-on-top, newest at the bottom — matches the on-screen grid order.
  const grid = guesses
    .map((g) => WEAPONS_FIELD_ORDER.map((f) => EMOJI[g.feedback[f]]).join(""))
    .join("\n");
  // "Weapons" labels the mode; URL points recipients at /weapons.
  return `Expedition 33dle Weapons #${puzzleNumber} ${score}/${WEAPONS_MAX_GUESSES}\n\n${grid}\n\nhttps://expedition33dle.com/weapons`;
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
