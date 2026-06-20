import { ATTRIBUTES } from "../lib/attributes";
import type { ClassicGuessResponse } from "../lib/types";
import GuessRow, { GRID_TEMPLATE } from "./GuessRow";

// Character (portrait + name) first, then the shared comparison columns.
const COLUMNS = ["Character", ...ATTRIBUTES.map((a) => a.label)];

interface GuessGridProps {
  guesses: ClassicGuessResponse[];
  /** Entity id of the just-submitted guess — that row flip-reveals. */
  animateId?: number | null;
}

export default function GuessGrid({ guesses, animateId = null }: GuessGridProps) {
  const newestId = guesses.length ? guesses[guesses.length - 1].guess.id : null;

  // Nothing to show before the first guess — the column headers appear together
  // with the first row rather than floating above an empty grid.
  if (guesses.length === 0) return null;

  return (
    <section className="my-4">
      {/* One scroll container for header + rows so they pan in sync. tabIndex
          makes the overflow keyboard-scrollable; ARIA table roles give screen
          readers row/column structure the CSS-grid layout otherwise hides. */}
      <div
        role="table"
        aria-label="Guesses and attribute feedback"
        tabIndex={0}
        className="overflow-x-auto px-1 py-1"
      >
        <div role="rowgroup">
          <div className={`${GRID_TEMPLATE} mb-1.5`} role="row">
            {COLUMNS.map((label, i) => (
              <div
                key={label}
                role="columnheader"
                className={`font-label border-gold/40 text-gold/90 border-b-2 pb-1.5 text-sm tracking-[0.12em] break-words uppercase md:text-base ${
                  i === 0 ? "pl-2 text-left" : "text-center"
                }`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5" role="rowgroup">
          {/* Newest guess on top (LoLdle convention) — storage and the share
              string stay chronological; only display order flips. Copy before
              reverse() so the prop array isn't mutated. */}
          {[...guesses].reverse().map((g) => (
            <GuessRow
              key={g.guess.id}
              result={g}
              animate={g.guess.id === animateId}
              latest={g.guess.id === newestId}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
