import { STATE_VISUAL, type AttributeDescriptor } from "../lib/attributes";
import {
  CELL_BASE,
  NAME_CELL_BASE,
  PORTRAIT_SIZE,
  WIN_NAME,
  type NamedEntity,
} from "./GuessCells";
import Portrait from "./Portrait";

export interface AnswerRevealBaseProps<T extends NamedEntity, F> {
  answer: T | null; // null while loading
  attributes: readonly AttributeDescriptor<T, F>[];
  gridTemplate: string;
  dir: string;
  isError: boolean;
  onRetry: () => void;
}

/** Generic answer reveal: a single neutral row showing today's answer. Every
 *  per-mode *AnswerReveal wraps this. */
export default function AnswerRevealBase<T extends NamedEntity, F>({
  answer,
  attributes,
  gridTemplate,
  dir,
  isError,
  onRetry,
}: AnswerRevealBaseProps<T, F>) {
  return (
    <section className="mt-4">
      <p className="font-label text-gold/80 mb-1 text-center text-sm tracking-[0.18em] uppercase md:text-base">
        Today's answer
      </p>
      {answer ? (
        <div role="table" aria-label="Today's answer" className="overflow-x-auto">
          <div className={gridTemplate} role="row">
            <div
              role="rowheader"
              aria-label={`Answer: ${answer.name}`}
              className={`${NAME_CELL_BASE} ${WIN_NAME}`}
            >
              <Portrait
                name={answer.name}
                image={answer.image}
                dir={dir}
                className={PORTRAIT_SIZE}
              />
              <span
                aria-hidden="true"
                className="text-gold-bright font-display line-clamp-3 text-left text-sm leading-tight font-bold tracking-[0.02em] uppercase md:text-base lg:text-lg"
              >
                {answer.name}
              </span>
            </div>
            {attributes.map((attr) => (
              <div
                key={attr.key}
                role="cell"
                aria-label={`${attr.label}: ${attr.format(answer)}`}
                className={`${CELL_BASE} ${STATE_VISUAL.neutral.cell}`}
              >
                <span className="max-w-full font-semibold" aria-hidden="true">
                  {attr.format(answer)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : isError ? (
        <div>
          <p className="text-muted text-center text-xs italic">
            Could not load answer
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="border-gold text-gold hover:text-gold-bright hover:border-gold-bright mx-auto mt-1 block rounded-md border px-3 py-1 text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      ) : (
        <p className="text-muted text-center text-xs italic">Revealing…</p>
      )}
    </section>
  );
}
