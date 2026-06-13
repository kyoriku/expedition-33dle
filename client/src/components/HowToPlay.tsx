import type { GuessResponse } from "../lib/types";
import GuessGrid from "./GuessGrid";

// Synthetic example — fabricated feedback tied to no real puzzle, chosen to
// demonstrate every color state plus a directional arrow.
const EXAMPLE_GUESS: GuessResponse = {
  guess: {
    id: 0,
    name: "Gustave",
    gender: "male",
    age: 32,
    class_role: "Engineer",
    weapon: "Sword & Pistol",
    element: ["Lightning"],
    act_introduced: 1,
    species: "Human",
    affiliation: "Expedition 33",
  },
  feedback: {
    gender: "match",
    age: "unknown",
    class_role: "miss",
    weapon: "miss",
    element: "partial",
    act_introduced: "higher",
    species: "match",
    affiliation: "miss",
  },
  is_correct: false,
};

interface HowToPlayProps {
  onClose: () => void;
}

export default function HowToPlay({ onClose }: HowToPlayProps) {
  return (
    <div>
      <p className="text-parchment mb-3 text-sm">
        Guess today's <em>Clair Obscur: Expedition 33</em> character in 6
        tries.
      </p>
      <ul className="text-parchment mb-4 space-y-1.5 text-xs">
        {[
          <>Type a name to see suggestions</>,
          <>Each guess shows how close you are across 8 attributes</>,
          <>
            <span className="font-semibold text-match">Green</span> = exact
            match,{" "}
            <span className=" font-semibold text-partial">Gold</span> =
            partial/unknown,{" "} <span className="font-semibold text-miss">Red</span> = incorrect
          </>,
          <>Arrows mean the answer is higher (↑) or lower (↓) for Age and Act</>,
        ].map((item, i) => (
          <li key={i} className="relative pl-3.5 leading-snug">
            <span
              className="text-gold absolute top-0.75 left-0 text-[7px]"
              aria-hidden="true"
            >
              ◆
            </span>
            {item}
          </li>
        ))}
      </ul>
      <GuessGrid guesses={[EXAMPLE_GUESS]} />
      <p className="text-muted mt-4 text-center text-[11px] italic">
        A new puzzle is available every day at midnight UTC.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="bg-gold text-glyph hover:bg-gold-bright active:bg-gold-bright mt-3 w-full rounded-md py-2 text-sm font-bold"
      >
        Got it
      </button>
    </div>
  );
}
