import { BOSSES_ATTRIBUTES } from "../lib/attributes";
import type { Boss, BossGuessFeedback, BossGuessResponse } from "../lib/types";
import GuessGridBase from "./GuessGridBase";
import { BOSSES_GRID_TEMPLATE } from "./BossesGuessRow";

interface BossesGuessGridProps {
  guesses: BossGuessResponse[];
  animateId?: number | null;
}

export default function BossesGuessGrid({
  guesses,
  animateId = null,
}: BossesGuessGridProps) {
  return (
    <GuessGridBase<Boss, BossGuessFeedback>
      guesses={guesses}
      attributes={BOSSES_ATTRIBUTES}
      gridTemplate={BOSSES_GRID_TEMPLATE}
      dir="bosses"
      noun="Boss"
      animateId={animateId}
    />
  );
}
