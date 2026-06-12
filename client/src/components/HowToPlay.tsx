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
  },
  feedback: {
    gender: "match",
    age: "unknown",
    class_role: "miss",
    weapon: "miss",
    element: "partial",
    act_introduced: "higher",
  },
  is_correct: false,
};

interface HowToPlayProps {
  onClose: () => void;
}

export default function HowToPlay({ onClose }: HowToPlayProps) {
  return (
    <div>
      <p className="mb-3 text-sm text-zinc-300">
        Guess today's <em>Clair Obscur: Expedition 33</em> character in 6
        tries.
      </p>
      <ul className="mb-4 list-disc space-y-1 pl-5 text-xs text-zinc-300">
        <li>Type a name to see suggestions</li>
        <li>Each guess shows how close you are across 6 attributes</li>
        <li>
          <span className="font-semibold text-green-500">Green</span> = exact
          match,{" "}
          <span className="font-semibold text-yellow-500">Yellow</span> =
          partial/unknown, Gray = miss
        </li>
        <li>Arrows mean the answer is higher (↑) or lower (↓) for Age and Act</li>
      </ul>
      <GuessGrid guesses={[EXAMPLE_GUESS]} />
      <p className="mt-4 text-center text-[11px] text-zinc-500">
        A new puzzle is available every day at midnight UTC.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-3 w-full rounded-md bg-green-700 py-2 text-sm font-semibold text-white active:bg-green-800"
      >
        Got it
      </button>
    </div>
  );
}
