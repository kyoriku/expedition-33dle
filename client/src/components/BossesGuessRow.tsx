import { BOSSES_ATTRIBUTES } from "../lib/attributes";
import type { Boss, BossGuessFeedback, BossGuessResponse } from "../lib/types";
import GuessRowBase from "./GuessRowBase";

// Bosses' 6-column grid template — a literal string (Tailwind JIT scans literals)
// imported by BossesGuessGrid + BossesAnswerReveal. Same cell sizes / name-column
// widths as the other modes so the grids line up exactly.
export const BOSSES_GRID_TEMPLATE =
  "grid w-max mx-auto grid-cols-[200px_repeat(6,92px)] gap-1.5 " +
  "lg:grid-cols-[250px_repeat(6,96px)]";

interface BossesGuessRowProps {
  result: BossGuessResponse;
  animate?: boolean;
  latest?: boolean;
}

export default function BossesGuessRow({
  result,
  animate = false,
  latest = false,
}: BossesGuessRowProps) {
  return (
    <GuessRowBase<Boss, BossGuessFeedback>
      result={result}
      attributes={BOSSES_ATTRIBUTES}
      gridTemplate={BOSSES_GRID_TEMPLATE}
      dir="bosses"
      animate={animate}
      latest={latest}
    />
  );
}
