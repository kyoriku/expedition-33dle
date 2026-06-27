import { ATTRIBUTES } from "../lib/attributes";
import type {
  Character,
  ClassicGuessFeedback,
  ClassicGuessResponse,
} from "../lib/types";
import GuessRowBase from "./GuessRowBase";

// Classic's 8-column grid template — a literal string (Tailwind's JIT scanner
// only sees literals) imported by GuessGrid + AnswerReveal, peer of the other
// modes' *_GRID_TEMPLATE. Name column + 8 attr cols (92px mobile / 96px desktop)
// so every mode's grid lines up exactly.
export const GRID_TEMPLATE =
  "grid w-max mx-auto grid-cols-[200px_repeat(8,92px)] gap-1.5 " +
  "lg:grid-cols-[250px_repeat(8,96px)]";

interface GuessRowProps {
  result: ClassicGuessResponse;
  animate?: boolean;
  latest?: boolean;
}

export default function GuessRow({
  result,
  animate = false,
  latest = false,
}: GuessRowProps) {
  return (
    <GuessRowBase<Character, ClassicGuessFeedback>
      result={result}
      attributes={ATTRIBUTES}
      gridTemplate={GRID_TEMPLATE}
      dir="portraits"
      animate={animate}
      latest={latest}
    />
  );
}
