import type { ClassicGuessResponse } from "../lib/types";
import { CLASSIC_MAX_GUESSES } from "../lib/stats";
import GuessGrid from "./GuessGrid";

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

// Swatch + glyph + plain-parchment description. Parchment text (not the
// low-contrast feedback color itself) keeps every line WCAG AA legible.
const KEY: { cls: string; glyph: string; glyphCls: string; label: string }[] = [
  { cls: "bg-match border border-match-edge", glyph: "✓", glyphCls: "text-parchment", label: "Exact match" },
  { cls: "bg-partial border border-partial-edge", glyph: "≈", glyphCls: "text-glyph", label: "Partial — shares some elements" },
  { cls: "bg-miss border border-miss-edge", glyph: "✗", glyphCls: "text-parchment", label: "No match" },
  { cls: "bg-miss border border-miss-edge", glyph: "▲", glyphCls: "text-parchment", label: "Answer’s Act is higher" },
  { cls: "bg-miss border border-miss-edge", glyph: "▼", glyphCls: "text-parchment", label: "Answer’s Act is lower" },
];

export default function HowToPlay({ onClose }: HowToPlayProps) {
  return (
    <div>
      {/* Copy stays at a comfortable reading width; the example grid below
          spans the full modal so it matches the live board. */}
      <div className="mx-auto max-w-3xl">
        <p className="text-parchment mb-3 text-lg">
          Guess today's <em>Clair Obscur: Expedition 33</em> Character in{" "}
          {CLASSIC_MAX_GUESSES} tries.
        </p>
        <ul className="text-parchment mb-3 space-y-1.5 text-base">
          {[
            <>Type a name to see suggestions</>,
            <>Each guess shows how close you are across 8 attributes</>,
          ].map((item, i) => (
            <li key={i} className="relative pl-3.5 leading-snug">
              <span
                className="text-gold absolute top-1 left-0 text-[9px]"
                aria-hidden="true"
              >
                ◆
              </span>
              {item}
            </li>
          ))}
        </ul>
        <ul className="text-parchment mb-4 grid grid-cols-1 gap-2 text-base sm:grid-cols-2">
          {KEY.map(({ cls, glyph, glyphCls, label }) => (
            <li key={label} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`${cls} ${glyphCls} state-glyph flex h-5 w-5 shrink-0 items-center justify-center text-[12px] font-bold`}
              >
                {glyph}
              </span>
              <span className="leading-snug">{label}</span>
            </li>
          ))}
        </ul>
      </div>
      <GuessGrid guesses={[EXAMPLE_GUESS]} />
      <div className="mx-auto max-w-3xl">
        <p className="text-parchment/80 mt-4 text-center text-sm">
          A new puzzle is available every day at midnight UTC.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="bg-gold text-glyph hover:bg-gold-bright active:bg-gold-bright font-label mx-auto mt-3 block w-full max-w-md py-2.5 text-base tracking-[0.18em] uppercase"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
