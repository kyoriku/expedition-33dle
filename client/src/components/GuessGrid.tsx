import { ATTRIBUTES } from "../lib/attributes";
import type {
  Character,
  ClassicGuessFeedback,
  ClassicGuessResponse,
} from "../lib/types";
import GuessGridBase from "./GuessGridBase";
import { GRID_TEMPLATE } from "./GuessRow";

interface GuessGridProps {
  guesses: ClassicGuessResponse[];
  animateId?: number | null;
}

export default function GuessGrid({ guesses, animateId = null }: GuessGridProps) {
  return (
    <GuessGridBase<Character, ClassicGuessFeedback>
      guesses={guesses}
      attributes={ATTRIBUTES}
      gridTemplate={GRID_TEMPLATE}
      dir="portraits"
      noun="Character"
      animateId={animateId}
    />
  );
}
