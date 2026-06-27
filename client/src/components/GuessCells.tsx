import {
  cellAriaLabel,
  DIRECTION_BIG,
  STATE_GLYPH,
  STATE_VISUAL,
  type CellState,
} from "../lib/attributes";

// Shared cell + geometry primitives for every mode's guess grid / row / answer-reveal.
// Mode-agnostic — relocated out of GuessRow.tsx so each per-mode component is a thin
// wrapper over the generic *Base components, all drawing the same chrome from here.

/** Minimal entity shape every mode's guess data satisfies (Character/Picto/Weapon/Boss). */
export interface NamedEntity {
  id: number;
  name: string;
  image: string | null;
}

/** A scored guess: the entity, its per-attribute feedback, and the win flag. */
export interface GuessResult<T, F> {
  guess: T;
  feedback: F;
  is_correct: boolean;
}

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
      {big ? (
        // Directional cells: arrow and value sit inline (▲ 15) so they read
        // cleanly. A dedicated class (not VALUE_TEXT) avoids the line-clamp vs
        // flex display conflict; the value is always a short number.
        <span
          aria-hidden="true"
          className="relative z-10 flex max-w-full items-center justify-center gap-1 font-semibold"
        >
          <span className="text-base leading-none">{big}</span>
          {value}
        </span>
      ) : (
        <span className={VALUE_TEXT} aria-hidden="true">
          {value}
        </span>
      )}
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
