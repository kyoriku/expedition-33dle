import { PICTOS_ATTRIBUTES } from "../lib/attributes";
import type { Picto, PictoGuessFeedback } from "../lib/types";
import AnswerRevealBase from "./AnswerRevealBase";
import { PICTOS_GRID_TEMPLATE } from "./PictosGuessRow";

interface PictosAnswerRevealProps {
  answer: Picto | null; // null while loading
  isError: boolean;
  onRetry: () => void;
}

export default function PictosAnswerReveal({
  answer,
  isError,
  onRetry,
}: PictosAnswerRevealProps) {
  return (
    <AnswerRevealBase<Picto, PictoGuessFeedback>
      answer={answer}
      attributes={PICTOS_ATTRIBUTES}
      gridTemplate={PICTOS_GRID_TEMPLATE}
      dir="pictos"
      isError={isError}
      onRetry={onRetry}
    />
  );
}
