import {
  ATTRIBUTES,
  cellAriaLabel,
  STATE_GLYPH,
  type CellState,
} from "../lib/attributes";
import { hyphenate } from "../lib/display";
import type { GuessResponse } from "../lib/types";

const CELL_STYLES: Record<CellState, string> = {
  match: "bg-match text-parchment",
  partial: "bg-partial text-glyph font-semibold", // element only
  unknown: "bg-partial text-glyph font-semibold", // age only — rendered with "?"
  miss: "bg-miss text-parchment",
  higher: "bg-miss text-parchment", // directional non-match = red + arrow
  lower: "bg-miss text-parchment",
  neutral: "bg-line text-parchment border border-raised",
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
  "bg-line border-gold-bright text-gold-bright border font-bold " +
  "shadow-[inset_0_0_10px_rgba(217,169,63,.12)]";

function Cell({
  feedback,
  value,
  label,
  ariaLabel,
  role = "cell",
  winName = false,
  flipIndex = null,
}: {
  feedback: CellState;
  value: string;
  label: string;
  ariaLabel?: string; // overrides the generated "label: value, state" phrasing
  role?: "cell" | "rowheader";
  winName?: boolean;
  flipIndex?: number | null; // stagger position; null = render in final state
}) {
  const glyph = STATE_GLYPH[feedback];
  return (
    <div
      role={role}
      aria-label={ariaLabel ?? cellAriaLabel(label, value, feedback)}
      className={`${CELL_BASE} ${winName ? WIN_NAME : CELL_STYLES[feedback]} ${
        flipIndex !== null ? "tile-reveal" : ""
      }`}
      style={
        flipIndex !== null ? { animationDelay: `${flipIndex * 80}ms` } : undefined
      }
    >
      <span className="max-w-full" aria-hidden="true">
        {hyphenate(value)}
      </span>
      {glyph && (
        <span className="text-[11px] leading-none font-bold" aria-hidden="true">
          {glyph}
        </span>
      )}
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
    <div className={GRID_TEMPLATE} role="row">
      <Cell
        feedback="neutral"
        value={guess.name}
        label="Your guess"
        ariaLabel={
          is_correct
            ? `${guess.name}, correct answer`
            : `Your guess: ${guess.name}`
        }
        role="rowheader"
        winName={is_correct}
      />
      {ATTRIBUTES.map((attr, i) => (
        <Cell
          key={attr.key}
          feedback={feedback[attr.key] as CellState}
          value={attr.format(guess)}
          label={attr.label}
          flipIndex={flip(i)}
        />
      ))}
    </div>
  );
}
