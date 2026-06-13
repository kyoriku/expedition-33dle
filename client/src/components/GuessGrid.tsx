import { hyphenate } from "../lib/display";
import type { GuessResponse } from "../lib/types";
import GuessRow, { GRID_TEMPLATE } from "./GuessRow";

const COLUMNS = [
  "Name",
  "Gender",
  "Age",
  "Class",
  "Weapon",
  "Element",
  "Act",
  "Species",
  "Affiliation",
];

interface GuessGridProps {
  guesses: GuessResponse[];
  /** Entity id of the just-submitted guess — that row flip-reveals. */
  animateId?: number | null;
}

export default function GuessGrid({ guesses, animateId = null }: GuessGridProps) {
  return (
    <section className="my-4">
      {/* One scroll container for header + rows so they pan in sync on mobile */}
      <div className="overflow-x-auto md:overflow-visible">
        <div className={`${GRID_TEMPLATE} mb-1`}>
          {COLUMNS.map((label) => (
            <div
              key={label}
              className="border-line text-muted border-b pb-1 text-center text-[9px] font-semibold tracking-wide break-words uppercase md:text-[11px]"
            >
              {hyphenate(label)}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1 md:gap-1.5">
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
