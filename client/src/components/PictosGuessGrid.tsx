import { PICTOS_ATTRIBUTES } from "../lib/attributes";
import type { Picto, PictoGuessFeedback, PictoGuessResponse } from "../lib/types";
import GuessGridBase from "./GuessGridBase";
import { PICTOS_GRID_TEMPLATE } from "./PictosGuessRow";

interface PictosGuessGridProps {
  guesses: PictoGuessResponse[];
  animateId?: number | null;
}

export default function PictosGuessGrid({
  guesses,
  animateId = null,
}: PictosGuessGridProps) {
  return (
    <GuessGridBase<Picto, PictoGuessFeedback>
      guesses={guesses}
      attributes={PICTOS_ATTRIBUTES}
      gridTemplate={PICTOS_GRID_TEMPLATE}
      dir="pictos"
      noun="Picto"
      animateId={animateId}
    />
  );
}
