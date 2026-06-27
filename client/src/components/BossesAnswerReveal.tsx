import { BOSSES_ATTRIBUTES } from "../lib/attributes";
import type { Boss, BossGuessFeedback } from "../lib/types";
import AnswerRevealBase from "./AnswerRevealBase";
import { BOSSES_GRID_TEMPLATE } from "./BossesGuessRow";

interface BossesAnswerRevealProps {
  answer: Boss | null; // null while loading
  isError: boolean;
  onRetry: () => void;
}

export default function BossesAnswerReveal({
  answer,
  isError,
  onRetry,
}: BossesAnswerRevealProps) {
  return (
    <AnswerRevealBase<Boss, BossGuessFeedback>
      answer={answer}
      attributes={BOSSES_ATTRIBUTES}
      gridTemplate={BOSSES_GRID_TEMPLATE}
      dir="bosses"
      isError={isError}
      onRetry={onRetry}
    />
  );
}
