import { WEAPONS_ATTRIBUTES } from "../lib/attributes";
import type {
  Weapon,
  WeaponGuessFeedback,
  WeaponGuessResponse,
} from "../lib/types";
import { WEAPONS_MAX_GUESSES } from "../lib/stats";
import HowToPlayBase from "./HowToPlayBase";
import { WEAPONS_GRID_TEMPLATE } from "./WeaponsGuessRow";

// Synthetic example — fabricated feedback tied to no real puzzle, chosen to
// demonstrate every color state plus a directional arrow. Values are valid game
// vocabulary (wielder/element/source/scaling) so the example reads true.
const EXAMPLE_GUESS: WeaponGuessResponse = {
  guess: {
    id: 0,
    name: "Abysseram",
    wielder: ["Gustave", "Verso"],
    element: "Physical",
    max_power: 3000,
    scaling_stats: ["Vitality"],
    source: "Pickup",
    act_introduced: 1,
    image: "abysseram.webp",
  },
  feedback: {
    wielder: "match",
    element: "miss",
    max_power: "higher",
    scaling_stats: "partial",
    source: "miss",
    act_introduced: "match",
  },
  is_correct: false,
};

interface WeaponsHowToPlayProps {
  onClose: () => void;
}

export default function WeaponsHowToPlay({ onClose }: WeaponsHowToPlayProps) {
  return (
    <HowToPlayBase<Weapon, WeaponGuessFeedback>
      exampleGuess={EXAMPLE_GUESS}
      attributes={WEAPONS_ATTRIBUTES}
      gridTemplate={WEAPONS_GRID_TEMPLATE}
      dir="weapons"
      noun="Weapon"
      maxGuesses={WEAPONS_MAX_GUESSES}
      partialHint="shares some scaling stats"
      directionalHint="Max Power/Act"
      onClose={onClose}
    />
  );
}
