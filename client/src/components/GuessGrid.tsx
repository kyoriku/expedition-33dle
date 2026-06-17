import { ATTRIBUTES } from "../lib/attributes";
import { hyphenate } from "../lib/display";
import type { GuessResponse } from "../lib/types";
import GuessRow, { GRID_TEMPLATE } from "./GuessRow";

// Name first, then the shared comparison columns (single source of truth).
const COLUMNS = ["Name", ...ATTRIBUTES.map((a) => a.label)];

interface GuessGridProps {
  guesses: GuessResponse[];
  /** Entity id of the just-submitted guess — that row flip-reveals. */
  animateId?: number | null;
}

export default function GuessGrid({ guesses, animateId = null }: GuessGridProps) {
  return (
    <section className="relative my-4">
      {/* Right-edge fade hints the grid scrolls horizontally on mobile; it's an
          overlay (not a mask) so it never clips the last column, and is hidden
          once the grid fits at md+. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-1 w-6 md:hidden"
        style={{ background: "linear-gradient(to left, var(--color-ink), transparent)" }}
      />
      {/* One scroll container for header + rows so they pan in sync on mobile.
          tabIndex makes the overflow keyboard-scrollable; ARIA table roles give
          screen readers row/column structure the CSS-grid layout otherwise hides. */}
      <div
        role="table"
        aria-label="Guesses and attribute feedback"
        tabIndex={0}
        className="overflow-x-auto md:overflow-visible"
      >
        <div role="rowgroup">
          <div className={`${GRID_TEMPLATE} mb-1`} role="row">
            {COLUMNS.map((label) => (
              <div
                key={label}
                role="columnheader"
                className="border-line text-muted border-b pb-1 text-center text-[9px] font-semibold tracking-wide break-words uppercase md:text-[11px]"
              >
                {hyphenate(label)}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1 md:gap-1.5" role="rowgroup">
          {/* Newest guess on top (LoLdle convention) — storage and the share
              string stay chronological; only display order flips. Copy before
              reverse() so the prop array isn't mutated. */}
          {[...guesses].reverse().map((g) => (
            <GuessRow
              key={g.guess.id}
              result={g}
              animate={g.guess.id === animateId}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
