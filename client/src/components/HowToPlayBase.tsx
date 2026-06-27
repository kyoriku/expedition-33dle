import type { AttributeDescriptor } from "../lib/attributes";
import GuessGridBase from "./GuessGridBase";
import type { GuessResult, NamedEntity } from "./GuessCells";

export interface HowToPlayBaseProps<T extends NamedEntity, F> {
  /** Synthetic example guess (mode-specific) demonstrating every feedback state. */
  exampleGuess: GuessResult<T, F>;
  attributes: readonly AttributeDescriptor<T, F>[];
  gridTemplate: string;
  dir: string;
  noun: string;
  maxGuesses: number;
  /** Suffix for the partial-match legend row, e.g. "shares some elements". */
  partialHint: string;
  /** The directional field(s) named in the ▲/▼ rows, e.g. "Lumina/Act". */
  directionalHint: string;
  onClose: () => void;
}

/** Generic "How to Play" modal body. Layout + legend are shared; only the example
 *  guess and the three mode-specific label strings vary. Every per-mode *HowToPlay
 *  wraps this with its content bundle. */
export default function HowToPlayBase<T extends NamedEntity, F>({
  exampleGuess,
  attributes,
  gridTemplate,
  dir,
  noun,
  maxGuesses,
  partialHint,
  directionalHint,
  onClose,
}: HowToPlayBaseProps<T, F>) {
  // Swatch + glyph + plain-parchment description. Parchment text (not the
  // low-contrast feedback color itself) keeps every line WCAG AA legible.
  const KEY: { cls: string; glyph: string; glyphCls: string; label: string }[] = [
    { cls: "bg-match border border-match-edge", glyph: "✓", glyphCls: "text-parchment", label: "Exact match" },
    { cls: "bg-partial border border-partial-edge", glyph: "≈", glyphCls: "text-glyph", label: `Partial — ${partialHint}` },
    { cls: "bg-miss border border-miss-edge", glyph: "✗", glyphCls: "text-parchment", label: "No match" },
    { cls: "bg-miss border border-miss-edge", glyph: "▲", glyphCls: "text-parchment", label: `Answer’s ${directionalHint} is higher` },
    { cls: "bg-miss border border-miss-edge", glyph: "▼", glyphCls: "text-parchment", label: `Answer’s ${directionalHint} is lower` },
  ];

  return (
    <div>
      {/* Copy stays at a comfortable reading width; the example grid below
          spans the full modal so it matches the live board. */}
      <div className="mx-auto max-w-3xl">
        <p className="text-parchment mb-3 text-lg">
          Guess today's <em>Clair Obscur: Expedition 33</em> {noun} in{" "}
          {maxGuesses} tries.
        </p>
        <ul className="text-parchment mb-3 space-y-1.5 text-base">
          {[
            <>Type a name to see suggestions</>,
            <>Each guess shows how close you are across {attributes.length} attributes</>,
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
      <GuessGridBase
        guesses={[exampleGuess]}
        attributes={attributes}
        gridTemplate={gridTemplate}
        dir={dir}
        noun={noun}
      />
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
