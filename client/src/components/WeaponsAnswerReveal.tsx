import { WEAPONS_ATTRIBUTES } from "../lib/attributes";
import type { Weapon, WeaponGuessFeedback } from "../lib/types";
import AnswerRevealBase from "./AnswerRevealBase";
import { WEAPONS_GRID_TEMPLATE } from "./WeaponsGuessRow";

interface WeaponsAnswerRevealProps {
  answer: Weapon | null; // null while loading
  isError: boolean;
  onRetry: () => void;
}

export default function WeaponsAnswerReveal({
  answer,
  isError,
  onRetry,
}: WeaponsAnswerRevealProps) {
  return (
    <AnswerRevealBase<Weapon, WeaponGuessFeedback>
      answer={answer}
      attributes={WEAPONS_ATTRIBUTES}
      gridTemplate={WEAPONS_GRID_TEMPLATE}
      dir="weapons"
      isError={isError}
      onRetry={onRetry}
    />
  );
}
