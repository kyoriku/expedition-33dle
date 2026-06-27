import { BOSSES_ATTRIBUTES } from "../lib/attributes";
import type { Boss, BossGuessFeedback, BossGuessResponse } from "../lib/types";
import { BOSSES_MAX_GUESSES } from "../lib/stats";
import HowToPlayBase from "./HowToPlayBase";
import { BOSSES_GRID_TEMPLATE } from "./BossesGuessRow";

// Synthetic example — real boss (Goblu) with fabricated feedback tied to no real
// puzzle, chosen to demonstrate every color state plus a directional arrow. Values
// are valid game vocabulary (weakness/resistance/category/location) so it reads true.
const EXAMPLE_GUESS: BossGuessResponse = {
  guess: {
    id: 0,
    name: "Goblu",
    weakness: ["Lightning"],
    resistance: ["Ice", "Dark"],
    category: "Nevron",
    location: "Flying Waters",
    encounter: "Required",
    act_introduced: 1,
    image: null,
  },
  feedback: {
    weakness: "match",
    resistance: "partial",
    category: "match",
    location: "miss",
    encounter: "miss",
    act_introduced: "higher",
  },
  is_correct: false,
};

interface BossesHowToPlayProps {
  onClose: () => void;
}

export default function BossesHowToPlay({ onClose }: BossesHowToPlayProps) {
  return (
    <HowToPlayBase<Boss, BossGuessFeedback>
      exampleGuess={EXAMPLE_GUESS}
      attributes={BOSSES_ATTRIBUTES}
      gridTemplate={BOSSES_GRID_TEMPLATE}
      dir="bosses"
      noun="Boss"
      maxGuesses={BOSSES_MAX_GUESSES}
      partialHint="shares some weaknesses/resistances"
      directionalHint="Act"
      onClose={onClose}
    />
  );
}
