import { BOSSES_ATTRIBUTES } from "../lib/attributes";
import type { BossGuessResponse } from "../lib/types";
import BossesGuessRow, { BOSSES_GRID_TEMPLATE } from "./BossesGuessRow";

// Boss (name) first, then the 6 shared comparison columns.
const COLUMNS = ["Boss", ...BOSSES_ATTRIBUTES.map((a) => a.label)];

interface BossesGuessGridProps {
  guesses: BossGuessResponse[];
  /** Boss id of the just-submitted guess — that row flip-reveals. */
  animateId?: number | null;
}

export default function BossesGuessGrid({
  guesses,
  animateId = null,
}: BossesGuessGridProps) {
  const newestId = guesses.length ? guesses[guesses.length - 1].guess.id : null;

  // Nothing to show before the first guess — headers appear with the first row.
  if (guesses.length === 0) return null;

  return (
    <section className="my-4">
      <div
        role="table"
        aria-label="Guesses and attribute feedback"
        tabIndex={0}
        className="overflow-x-auto px-1 py-1"
      >
        <div role="rowgroup">
          <div className={`${BOSSES_GRID_TEMPLATE} mb-1.5`} role="row">
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
          {/* Oldest guess on top, newest at the bottom (traditional Wordle
              order) — matches the chronological storage and share-string order. */}
          {guesses.map((g) => (
            <BossesGuessRow
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
