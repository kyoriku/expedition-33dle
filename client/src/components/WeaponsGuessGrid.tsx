import { WEAPONS_ATTRIBUTES } from "../lib/attributes";
import type {
  Weapon,
  WeaponGuessFeedback,
  WeaponGuessResponse,
} from "../lib/types";
import GuessGridBase from "./GuessGridBase";
import { WEAPONS_GRID_TEMPLATE } from "./WeaponsGuessRow";

interface WeaponsGuessGridProps {
  guesses: WeaponGuessResponse[];
  animateId?: number | null;
}

export default function WeaponsGuessGrid({
  guesses,
  animateId = null,
}: WeaponsGuessGridProps) {
  return (
    <GuessGridBase<Weapon, WeaponGuessFeedback>
      guesses={guesses}
      attributes={WEAPONS_ATTRIBUTES}
      gridTemplate={WEAPONS_GRID_TEMPLATE}
      dir="weapons"
      noun="Weapon"
      animateId={animateId}
    />
  );
}
