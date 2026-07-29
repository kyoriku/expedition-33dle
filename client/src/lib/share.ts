import {
  BOSSES_FIELD_ORDER,
  FIELD_ORDER,
  PICTOS_FIELD_ORDER,
  WEAPONS_FIELD_ORDER,
} from "./attributes";
import {
  BOSSES_MAX_GUESSES,
  CLASSIC_MAX_GUESSES,
  PICTOS_MAX_GUESSES,
  WEAPONS_MAX_GUESSES,
} from "./stats";
import type {
  GameStatus,
  BossGuessFeedback,
  ClassicGuessFeedback,
  PictoGuessFeedback,
  WeaponGuessFeedback,
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

/** Build one mode's share-string formatter. `name` gives both the label
 *  (capitalized) and the URL slug; `fieldOrder` is the column/emoji order;
 *  `maxGuesses` is the score denominator. Output is byte-identical to the
 *  hand-written per-mode builders (oldest row on top). */
function makeShareBuilder<F>(
  name: string,
  fieldOrder: readonly (keyof F & string)[],
  maxGuesses: number,
) {
  const label = name[0].toUpperCase() + name.slice(1);
  return (
    guesses: readonly { feedback: F }[],
    puzzleNumber: number,
    status: GameStatus,
  ): string => {
    const score = status === "won" ? String(guesses.length) : "X";
    // Oldest-on-top, newest at the bottom — matches the on-screen grid order.
    const grid = guesses
      .map((g) => fieldOrder.map((f) => EMOJI[String(g.feedback[f])]).join(""))
      .join("\n");
    return `Expedition 33dle ${label} #${puzzleNumber} ${score}/${maxGuesses}\n\n${grid}\n\nhttps://expedition33dle.com/${name}`;
  };
}

export const buildShareString = makeShareBuilder<ClassicGuessFeedback>(
  "classic",
  FIELD_ORDER,
  CLASSIC_MAX_GUESSES,
);
export const buildPictosShareString = makeShareBuilder<PictoGuessFeedback>(
  "pictos",
  PICTOS_FIELD_ORDER,
  PICTOS_MAX_GUESSES,
);
export const buildWeaponsShareString = makeShareBuilder<WeaponGuessFeedback>(
  "weapons",
  WEAPONS_FIELD_ORDER,
  WEAPONS_MAX_GUESSES,
);
export const buildBossesShareString = makeShareBuilder<BossGuessFeedback>(
  "bosses",
  BOSSES_FIELD_ORDER,
  BOSSES_MAX_GUESSES,
);

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
