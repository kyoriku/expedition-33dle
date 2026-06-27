import { ATTRIBUTES } from "../lib/attributes";
import type {
  Character,
  ClassicGuessFeedback,
  ClassicGuessResponse,
} from "../lib/types";
import { CLASSIC_MAX_GUESSES } from "../lib/stats";
import HowToPlayBase from "./HowToPlayBase";
import { GRID_TEMPLATE } from "./GuessRow";

// Synthetic example — fabricated feedback tied to no real puzzle, chosen to
// demonstrate every color state plus a directional arrow.
const EXAMPLE_GUESS: ClassicGuessResponse = {
  guess: {
    id: 0,
    name: "Gustave",
    gender: "Male",
    role: "Playable",
    weapon: "Sword & Pistol",
    element: ["Lightning"],
    act_introduced: 1,
    category: "Human",
    affiliation: ["Expedition 33"],
    zone: "Lumière",
    image: "gustave.webp",
  },
  feedback: {
    gender: "match",
    role: "miss",
    weapon: "miss",
    element: "partial",
    act_introduced: "higher",
    category: "match",
    affiliation: "miss",
    zone: "miss",
  },
  is_correct: false,
};

interface HowToPlayProps {
  onClose: () => void;
}

export default function HowToPlay({ onClose }: HowToPlayProps) {
  return (
    <HowToPlayBase<Character, ClassicGuessFeedback>
      exampleGuess={EXAMPLE_GUESS}
      attributes={ATTRIBUTES}
      gridTemplate={GRID_TEMPLATE}
      dir="portraits"
      noun="Character"
      maxGuesses={CLASSIC_MAX_GUESSES}
      partialHint="shares some elements"
      directionalHint="Act"
      onClose={onClose}
    />
  );
}
