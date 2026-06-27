import { ATTRIBUTES } from "../lib/attributes";
import type { Character, ClassicGuessFeedback } from "../lib/types";
import AnswerRevealBase from "./AnswerRevealBase";
import { GRID_TEMPLATE } from "./GuessRow";

interface AnswerRevealProps {
  answer: Character | null; // null while loading
  isError: boolean;
  onRetry: () => void;
}

export default function AnswerReveal({
  answer,
  isError,
  onRetry,
}: AnswerRevealProps) {
  return (
    <AnswerRevealBase<Character, ClassicGuessFeedback>
      answer={answer}
      attributes={ATTRIBUTES}
      gridTemplate={GRID_TEMPLATE}
      dir="portraits"
      isError={isError}
      onRetry={onRetry}
    />
  );
}
