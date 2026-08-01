import type { AttributeDescriptor, CellState } from "../lib/attributes";
import {
  Cell,
  NAME_CELL_BASE,
  PORTRAIT_SIZE,
  WIN_NAME,
  type GuessResult,
  type NamedEntity,
} from "./GuessCells";
import Portrait from "./Portrait";

export interface GuessRowBaseProps<T extends NamedEntity, F> {
  result: GuessResult<T, F>;
  attributes: readonly AttributeDescriptor<T, F>[];
  /** Literal Tailwind grid-template (per-mode column count). */
  gridTemplate: string;
  /** Portrait public subdir (portraits / pictos / weapons / bosses). */
  dir: string;
  /** Flip-reveal the attribute cells (just-submitted guesses only). The name
   *  cell stays static so the player immediately sees what they guessed. */
  animate?: boolean;
  /** The most recent guess — gets a gold ring to draw the eye. */
  latest?: boolean;
}

/** Generic guess row, parameterized by entity (T) + feedback (F) and the mode's
 *  attribute config. Every per-mode *GuessRow is a thin wrapper over this. */
export default function GuessRowBase<T extends NamedEntity, F>({
  result,
  attributes,
  gridTemplate,
  dir,
  animate = false,
  latest = false,
}: GuessRowBaseProps<T, F>) {
  const { guess, feedback, is_correct } = result;
  const flip = (i: number) => (animate ? i : null);
  return (
    <div
      className={`${gridTemplate} ${
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
          dir={dir}
          className={PORTRAIT_SIZE}
        />
        <span
          aria-hidden="true"
          className={`font-display line-clamp-3 text-left text-sm leading-tight tracking-[0.02em] uppercase md:text-base ${
            is_correct ? "text-gold-bright font-bold" : "text-gold"
          }`}
        >
          {guess.name}
        </span>
      </div>
      {attributes.map((attr, i) => (
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
