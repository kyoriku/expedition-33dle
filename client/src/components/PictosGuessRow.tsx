import { PICTOS_ATTRIBUTES } from "../lib/attributes";
import type { Picto, PictoGuessFeedback, PictoGuessResponse } from "../lib/types";
import GuessRowBase from "./GuessRowBase";

// Pictos' 7-column grid template — a literal string (Tailwind JIT scans literals)
// imported by PictosGuessGrid + PictosAnswerReveal. Same cell sizes / name-column
// widths as the other modes so the grids line up exactly.
export const PICTOS_GRID_TEMPLATE =
  "grid w-max mx-auto grid-cols-[200px_repeat(7,92px)] gap-1.5 " +
  "lg:grid-cols-[250px_repeat(7,96px)]";

interface PictosGuessRowProps {
  result: PictoGuessResponse;
  animate?: boolean;
  latest?: boolean;
}

export default function PictosGuessRow({
  result,
  animate = false,
  latest = false,
}: PictosGuessRowProps) {
  return (
    <GuessRowBase<Picto, PictoGuessFeedback>
      result={result}
      attributes={PICTOS_ATTRIBUTES}
      gridTemplate={PICTOS_GRID_TEMPLATE}
      dir="pictos"
      animate={animate}
      latest={latest}
    />
  );
}
