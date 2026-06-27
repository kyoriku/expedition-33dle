import { BOSSES_ATTRIBUTES, type CellState } from "../lib/attributes";
import type { BossGuessResponse } from "../lib/types";
import { Cell, NAME_CELL_BASE, PORTRAIT_SIZE, WIN_NAME } from "./GuessRow";
import Portrait from "./Portrait";

// 6 attribute columns. Same cell sizes and name-column widths as the classic/pictos/
// weapons grids so the modes line up exactly: square cells (92x92 mobile, 96x96 desktop)
// and a 200px/250px name column. Content-width + centered on desktop; overflows +
// scrolls on mobile. Literal strings so Tailwind's JIT scanner picks them up — the
// column count can't be runtime-built.
export const BOSSES_GRID_TEMPLATE =
  "grid w-max mx-auto grid-cols-[200px_repeat(6,92px)] gap-1.5 " +
  "lg:grid-cols-[250px_repeat(6,96px)]";

// NAME_CELL_BASE carries the same fixed h-23 height as the attribute cells (via
// Cell/CELL_BASE), so the name cell lines up with the rest of the row.
const NAME_CELL = `${NAME_CELL_BASE} bg-panneau border-line border`;

interface BossesGuessRowProps {
  result: BossGuessResponse;
  /** Flip-reveal the attribute cells (just-submitted guesses only). The name
   *  cell stays static so the player immediately sees what they guessed. */
  animate?: boolean;
  /** The most recent guess — gets a gold ring to draw the eye. */
  latest?: boolean;
}

export default function BossesGuessRow({
  result,
  animate = false,
  latest = false,
}: BossesGuessRowProps) {
  const { guess, feedback, is_correct } = result;
  const flip = (i: number) => (animate ? i : null);
  return (
    <div
      className={`${BOSSES_GRID_TEMPLATE} ${
        latest ? "ring-gold/40 ring-offset-ink ring-1 ring-offset-2" : ""
      }`}
      role="row"
    >
      {/* Name cell — boss icon (monogram fallback when art is missing) + name. */}
      <div
        role="rowheader"
        aria-label={
          is_correct ? `${guess.name}, correct answer` : `Your guess: ${guess.name}`
        }
        className={is_correct ? `${NAME_CELL_BASE} ${WIN_NAME}` : NAME_CELL}
      >
        <Portrait
          name={guess.name}
          image={guess.image}
          dir="bosses"
          className={PORTRAIT_SIZE}
        />
        <span
          aria-hidden="true"
          className={`font-display line-clamp-3 text-left text-sm leading-tight tracking-[0.02em] uppercase md:text-base lg:text-lg ${
            is_correct ? "text-gold-bright font-bold" : "text-gold"
          }`}
        >
          {guess.name}
        </span>
      </div>
      {BOSSES_ATTRIBUTES.map((attr, i) => (
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
