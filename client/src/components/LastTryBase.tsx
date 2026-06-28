import type { AttributeDescriptor, CellState } from "../lib/attributes";
import type { GuessResult } from "./GuessCells";

/** Segmented bar summarizing how many attributes the most recent guess matched
 *  exactly — a quick "getting warmer" read above the grid. Generic over the mode's
 *  attribute config (every page passes its own); replaces the four per-mode copies. */
export default function LastTryBase<T, F>({
  guess,
  attributes,
}: {
  guess: GuessResult<T, F>;
  attributes: readonly AttributeDescriptor<T, F>[];
}) {
  const total = attributes.length;
  const exact = attributes.filter(
    (a) => (guess.feedback[a.key] as CellState) === "match",
  ).length;
  return (
    <div className="mx-auto mt-2.5 mb-1 flex w-fit max-w-full items-center gap-3">
      <span className="font-label text-muted text-xs tracking-[0.15em] uppercase">
        Last try
      </span>
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-4 ${i < exact ? "bg-match-edge" : "bg-gold/15"}`}
          />
        ))}
      </div>
      <span className="font-label text-gold text-xs tracking-[0.12em] tabular-nums">
        {exact}/{total} exact
      </span>
    </div>
  );
}
