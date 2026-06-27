import { PICTOS_ATTRIBUTES } from "../lib/attributes";
import type { Picto, PictoGuessFeedback, PictoGuessResponse } from "../lib/types";
import { PICTOS_MAX_GUESSES } from "../lib/stats";
import HowToPlayBase from "./HowToPlayBase";
import { PICTOS_GRID_TEMPLATE } from "./PictosGuessRow";

// Synthetic example — fabricated feedback tied to no real puzzle, chosen to
// demonstrate every color state plus a directional arrow. Values are valid
// game vocabulary (type/effect_category/source/stats) so the example reads true.
const EXAMPLE_GUESS: PictoGuessResponse = {
  guess: {
    id: 0,
    name: "Energising Start",
    type: "Support",
    stats: ["SPD"],
    lumina_cost: 10,
    effect_category: "AP",
    source: "Pickup",
    zone_obtained: "Spring Meadows",
    act_introduced: 1,
    image: "9-pictos.webp"
  },
  feedback: {
    type: "match",
    stats: "partial",
    lumina_cost: "higher",
    effect_category: "miss",
    source: "miss",
    zone_obtained: "miss",
    act_introduced: "match",
  },
  is_correct: false,
};

interface PictosHowToPlayProps {
  onClose: () => void;
}

export default function PictosHowToPlay({ onClose }: PictosHowToPlayProps) {
  return (
    <HowToPlayBase<Picto, PictoGuessFeedback>
      exampleGuess={EXAMPLE_GUESS}
      attributes={PICTOS_ATTRIBUTES}
      gridTemplate={PICTOS_GRID_TEMPLATE}
      dir="pictos"
      noun="Picto"
      maxGuesses={PICTOS_MAX_GUESSES}
      partialHint="shares some stats"
      directionalHint="Lumina/Act"
      onClose={onClose}
    />
  );
}
