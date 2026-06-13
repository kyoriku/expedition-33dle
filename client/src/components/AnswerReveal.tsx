import { hyphenate } from "../lib/display";
import type { Entity } from "../lib/types";
import { CELL_BASE, GRID_TEMPLATE, WIN_NAME } from "./GuessRow";

interface AnswerRevealProps {
  answer: Entity | null; // null while loading
  isError: boolean;
  onRetry: () => void;
}

// Neutral cell — attribute values without feedback color (nothing is being
// compared; the game is over).
const NEUTRAL = "bg-surface text-parchment";

export default function AnswerReveal({
  answer,
  isError,
  onRetry,
}: AnswerRevealProps) {
  return (
    <section className="mt-4">
      <p className="text-muted mb-1 text-center text-[10px] font-semibold tracking-wide uppercase md:text-[11px]">
        Today's answer
      </p>
      {answer ? (
        <div className="overflow-x-auto md:overflow-visible">
          <div className={GRID_TEMPLATE}>
            <div className={`${CELL_BASE} ${WIN_NAME}`}>
              <span className="max-w-full">{hyphenate(answer.name)}</span>
            </div>
            <div className={`${CELL_BASE} ${NEUTRAL}`}>
              <span className="max-w-full">{answer.gender}</span>
            </div>
            <div className={`${CELL_BASE} ${NEUTRAL}`}>
              <span className="max-w-full">
                {answer.age === null ? "—" : String(answer.age)}
              </span>
            </div>
            <div className={`${CELL_BASE} ${NEUTRAL}`}>
              <span className="max-w-full">{hyphenate(answer.class_role)}</span>
            </div>
            <div className={`${CELL_BASE} ${NEUTRAL}`}>
              <span className="max-w-full">{hyphenate(answer.weapon)}</span>
            </div>
            <div className={`${CELL_BASE} ${NEUTRAL}`}>
              <span className="max-w-full">
                {answer.element.length
                  ? hyphenate(answer.element.join(", "))
                  : "—"}
              </span>
            </div>
            <div className={`${CELL_BASE} ${NEUTRAL}`}>
              <span className="max-w-full">
                {String(answer.act_introduced)}
              </span>
            </div>
            <div className={`${CELL_BASE} ${NEUTRAL}`}>
              <span className="max-w-full">{hyphenate(answer.species)}</span>
            </div>
            <div className={`${CELL_BASE} ${NEUTRAL}`}>
              <span className="max-w-full">{hyphenate(answer.affiliation)}</span>
            </div>
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
