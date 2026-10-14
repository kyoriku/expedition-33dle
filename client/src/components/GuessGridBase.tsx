import type { AttributeDescriptor } from "../lib/attributes";
import GuessRowBase from "./GuessRowBase";
import type { GuessResult, NamedEntity } from "./GuessCells";

export interface GuessGridBaseProps<T extends NamedEntity, F> {
  guesses: GuessResult<T, F>[];
  attributes: readonly AttributeDescriptor<T, F>[];
  gridTemplate: string;
  dir: string;
  /** First-column header (the entity noun: Character / Picto / Weapon / Boss). */
  noun: string;
  /** Entity id of the just-submitted guess — that row flip-reveals. */
  animateId?: number | null;
}

/** Generic guess grid: a header row (noun + attribute labels) above one
 *  GuessRowBase per guess, oldest on top. Every per-mode *GuessGrid wraps this. */
export default function GuessGridBase<T extends NamedEntity, F>({
  guesses,
  attributes,
  gridTemplate,
  dir,
  noun,
  animateId = null,
}: GuessGridBaseProps<T, F>) {
  const newestId = guesses.length ? guesses[guesses.length - 1].guess.id : null;

  // Nothing to show before the first guess — headers appear with the first row.
  if (guesses.length === 0) return null;

  const columns = [noun, ...attributes.map((a) => a.label)];

  return (
    <section className="my-4">
      <div
        role="table"
        aria-label="Guesses and attribute feedback"
        tabIndex={0}
        className="overflow-x-auto px-1 py-1"
      >
        <div role="rowgroup">
          <div className={`${gridTemplate} mb-1.5`} role="row">
            {columns.map((label, i) => (
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
          {/* Oldest guess on top, newest at the bottom — matches the
              chronological storage and share-string order. */}
          {guesses.map((g) => (
            <GuessRowBase
              key={g.guess.id}
              result={g}
              attributes={attributes}
              gridTemplate={gridTemplate}
              dir={dir}
              animate={g.guess.id === animateId}
              latest={g.guess.id === newestId}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
