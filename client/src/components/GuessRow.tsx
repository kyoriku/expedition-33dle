import {
  ATTRIBUTES,
  cellAriaLabel,
  DIRECTION_BIG,
  STATE_GLYPH,
  STATE_VISUAL,
  type CellState,
} from "../lib/attributes";
import type { ClassicGuessResponse } from "../lib/types";
import Portrait from "./Portrait";

// Name column wide enough for a portrait + uppercase name; 8 fluid attr columns.
// Below lg: fixed-width columns that scroll horizontally (mobile/tablet).
// lg and up: fluid columns that fill the (wide) container, so the whole grid
// fits with no horizontal scroll and cells are wide enough to hold the text.
export const GRID_TEMPLATE =
  "grid w-max grid-cols-[200px_repeat(8,92px)] gap-1.5 " +
  "lg:w-full lg:grid-cols-[250px_repeat(8,minmax(0,1fr))]";

// Attribute cell. Background/border/text come from STATE_VISUAL; this is the
// shared geometry. Fixed height keeps every row uniform regardless of content
// length; below lg the columns are narrow (scrollable), so cell text is smaller
// and line-clamps — a busy multi-value cell can't stretch its row taller.
export const CELL_BASE =
  "relative flex h-23 flex-col items-center justify-center overflow-hidden p-1.5 " +
  "text-center text-sm leading-snug break-words font-serif lg:min-h-24 " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,.08)]";

// Name cell geometry (left-aligned, holds the portrait).
export const NAME_CELL_BASE =
  "relative flex h-23 items-center gap-2.5 overflow-hidden px-2.5 lg:min-h-24 " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,.08)]";

// Correct guess: the name cell becomes the gold brand moment.
export const WIN_NAME =
  "bg-panneau border border-gold-bright text-gold-bright " +
  "shadow-[inset_0_0_12px_rgba(217,169,63,.15)]";

export const PORTRAIT_SIZE = "h-12 w-12 md:h-14 md:w-14 lg:h-16 lg:w-16";

// Value text: semibold EB Garamond. (No drop-shadow — the gradients already
// meet AA contrast, and a shadow muddied the dark text on the gold cells.)
const VALUE_TEXT = "relative z-10 max-w-full font-semibold line-clamp-4";

export function Cell({
  feedback,
  value,
  label,
  flipIndex = null,
}: {
  feedback: CellState;
  value: string;
  label: string;
  flipIndex?: number | null; // stagger position; null = render in final state
}) {
  const big = DIRECTION_BIG[feedback];
  // Corner glyph for non-directional states (match ✓, partial ≈, miss ✗, unknown ?).
  const corner = big ? undefined : STATE_GLYPH[feedback];
  return (
    <div
      role="cell"
      aria-label={cellAriaLabel(label, value, feedback)}
      className={`${CELL_BASE} ${STATE_VISUAL[feedback].cell} ${
        flipIndex !== null ? "tile-reveal" : ""
      }`}
      style={
        flipIndex !== null ? { animationDelay: `${flipIndex * 80}ms` } : undefined
      }
    >
      {big && (
        <span
          aria-hidden="true"
          className="font-display pointer-events-none absolute inset-0 flex items-center justify-center text-3xl leading-none opacity-20"
        >
          {big}
        </span>
      )}
      <span className={VALUE_TEXT} aria-hidden="true">
        {value}
      </span>
      {corner && (
        <span
          aria-hidden="true"
          className="state-glyph absolute top-0.5 right-0.5 z-10 text-[12px] leading-none font-bold opacity-80"
        >
          {corner}
        </span>
      )}
    </div>
  );
}

interface GuessRowProps {
  result: ClassicGuessResponse;
  /** Flip-reveal the attribute cells (just-submitted guesses only). The Name
   *  cell stays static so the player immediately sees what they guessed. */
  animate?: boolean;
  /** The most recent guess — gets a gold ring to draw the eye. */
  latest?: boolean;
}

export default function GuessRow({
  result,
  animate = false,
  latest = false,
}: GuessRowProps) {
  const { guess, feedback, is_correct } = result;
  const flip = (i: number) => (animate ? i : null);
  return (
    <div
      className={`${GRID_TEMPLATE} ${
        latest ? "ring-gold/40 ring-offset-ink ring-1 ring-offset-2" : ""
      }`}
      role="row"
    >
      <div
        role="rowheader"
        aria-label={
          is_correct
            ? `${guess.name}, correct answer`
            : `Your guess: ${guess.name}`
        }
        className={`${NAME_CELL_BASE} ${
          is_correct ? WIN_NAME : "bg-panneau border-line border"
        }`}
      >
        <Portrait
          name={guess.name}
          image={guess.image}
          className={PORTRAIT_SIZE}
        />
        <span
          aria-hidden="true"
          className={`font-display line-clamp-3 text-left text-sm leading-tight tracking-[0.02em] uppercase md:text-base lg:text-lg ${
            is_correct ? "text-gold-bright font-bold" : "text-gold"
          }`}
        >
          {guess.name}
        </span>
      </div>
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
