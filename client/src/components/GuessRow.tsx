import { hyphenate } from "../lib/display";
import type { GuessResponse } from "../lib/types";

type CellFeedback = "match" | "partial" | "miss" | "higher" | "lower" | "unknown";

const CELL_STYLES: Record<CellFeedback, string> = {
  match: "bg-match text-parchment",
  partial: "bg-partial text-glyph font-semibold", // element only
  unknown: "bg-partial text-glyph font-semibold", // age only — rendered with "?"
  miss: "bg-miss text-parchment",
  higher: "bg-miss text-parchment", // directional non-match = gray + arrow
  lower: "bg-miss text-parchment",
};

const CELL_GLYPHS: Partial<Record<CellFeedback, string>> = {
  higher: "↑",
  lower: "↓",
  unknown: "?",
};

// Shared by GuessGrid (header), GuessRow, and AnswerReveal so all rows align
// inside the mobile horizontal-scroll container; fluid 9 columns from md up.
export const GRID_TEMPLATE =
  "grid w-max grid-cols-[84px_repeat(8,72px)] gap-1 md:w-full md:grid-cols-9 md:gap-1.5";

export const CELL_BASE =
  "flex min-h-12 flex-col items-center justify-center rounded-[3px] p-1 " +
  "text-center text-[10px] leading-tight break-words " +
  "md:min-h-16 md:text-xs lg:min-h-18 lg:text-[13px] " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,.07),inset_0_-6px_12px_rgba(0,0,0,.18)]";

// Correct guess: the name cell becomes the gold brand moment.
export const WIN_NAME =
  "bg-surface border-gold text-gold border font-bold " +
  "shadow-[inset_0_0_10px_rgba(217,169,63,.12)]";

function Cell({
  feedback,
  value,
  winName = false,
  flipIndex = null,
}: {
  feedback: CellFeedback;
  value: string;
  winName?: boolean;
  flipIndex?: number | null; // stagger position; null = render in final state
}) {
  const glyph = CELL_GLYPHS[feedback];
  return (
    <div
      className={`${CELL_BASE} ${winName ? WIN_NAME : CELL_STYLES[feedback]} ${
        flipIndex !== null ? "tile-reveal" : ""
      }`}
      style={
        flipIndex !== null ? { animationDelay: `${flipIndex * 80}ms` } : undefined
      }
    >
      <span className="max-w-full">{hyphenate(value)}</span>
      {glyph && <span className="text-xs font-bold">{glyph}</span>}
    </div>
  );
}

interface GuessRowProps {
  result: GuessResponse;
  /** Flip-reveal the attribute cells (just-submitted guesses only). The Name
   *  cell stays static so the player immediately sees what they guessed. */
  animate?: boolean;
}

export default function GuessRow({ result, animate = false }: GuessRowProps) {
  const { guess, feedback, is_correct } = result;
  const flip = (i: number) => (animate ? i : null);
  return (
    <div className={GRID_TEMPLATE}>
      <Cell
        feedback={is_correct ? "match" : "miss"}
        value={guess.name}
        winName={is_correct}
      />
      <Cell feedback={feedback.gender} value={guess.gender} flipIndex={flip(0)} />
      <Cell
        feedback={feedback.age}
        value={guess.age === null ? "—" : String(guess.age)}
        flipIndex={flip(1)}
      />
      <Cell
        feedback={feedback.class_role}
        value={guess.class_role}
        flipIndex={flip(2)}
      />
      <Cell feedback={feedback.weapon} value={guess.weapon} flipIndex={flip(3)} />
      <Cell
        feedback={feedback.element}
        value={guess.element.length ? guess.element.join(", ") : "—"}
        flipIndex={flip(4)}
      />
      <Cell
        feedback={feedback.act_introduced}
        value={String(guess.act_introduced)}
        flipIndex={flip(5)}
      />
      <Cell feedback={feedback.species} value={guess.species} flipIndex={flip(6)} />
      <Cell
        feedback={feedback.affiliation}
        value={guess.affiliation}
        flipIndex={flip(7)}
      />
    </div>
  );
}
