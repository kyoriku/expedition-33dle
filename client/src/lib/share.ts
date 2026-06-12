import type { GameStatus, GuessFeedback, GuessResponse } from "./types";

// One emoji per attribute, in the matrix column order (minus name).
const FIELD_ORDER = [
  "gender",
  "age",
  "class_role",
  "weapon",
  "element",
  "act_introduced",
] as const satisfies readonly (keyof GuessFeedback)[];

// Spoiler-free by construction: higher/lower fold into the same square as
// miss, so the grid leaks no directional info.
const EMOJI: Record<string, string> = {
  match: "🟩",
  partial: "🟨", // element only
  unknown: "🟨", // age only
  miss: "⬜",
  higher: "⬜",
  lower: "⬜",
};

export function buildShareString(
  guesses: GuessResponse[],
  puzzleNumber: number,
  status: GameStatus,
): string {
  const score = status === "won" ? String(guesses.length) : "X";
  const grid = guesses
    .map((g) => FIELD_ORDER.map((f) => EMOJI[g.feedback[f]]).join(""))
    .join("\n");
  return `Expedition 33dle #${puzzleNumber} ${score}/6\n${grid}\nexpedition33dle.com`;
}
