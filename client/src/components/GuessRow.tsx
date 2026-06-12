import { hyphenate } from "../lib/display";
import type { GuessResponse } from "../lib/types";

type CellFeedback = "match" | "partial" | "miss" | "higher" | "lower" | "unknown";

const CELL_STYLES: Record<CellFeedback, string> = {
  match: "bg-match text-parchment",
  partial: "bg-partial text-glyph font-semibold", // element only
  unknown: "bg-partial text-glyph font-semibold", // age only — rendered with "?"
  miss: "bg-miss text-parchment",
  higher: "bg-miss text-parchment", // directional non-match = gray + arrow
  lower: "bg-miss text-parchment",
};

const CELL_GLYPHS: Partial<Record<CellFeedback, string>> = {
  higher: "↑",
  lower: "↓",
  unknown: "?",
};

const CELL_BASE =
  "flex min-h-12 flex-col items-center justify-center rounded-[3px] p-1 " +
  "text-center text-[10px] leading-tight break-words " +
  "md:min-h-16 md:text-xs lg:min-h-18 lg:text-[13px] " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,.07),inset_0_-6px_12px_rgba(0,0,0,.18)]";

// Correct guess: the name cell becomes the gold brand moment.
const WIN_NAME =
  "bg-surface border-gold text-gold border font-bold " +
  "shadow-[inset_0_0_10px_rgba(217,169,63,.12)]";

function Cell({
  feedback,
  value,
  winName = false,
}: {
  feedback: CellFeedback;
  value: string;
  winName?: boolean;
}) {
  const glyph = CELL_GLYPHS[feedback];
  return (
    <div
      className={`${CELL_BASE} ${winName ? WIN_NAME : CELL_STYLES[feedback]}`}
    >
      <span className="max-w-full">{hyphenate(value)}</span>
      {glyph && <span className="text-xs font-bold">{glyph}</span>}
    </div>
  );
}

interface GuessRowProps {
  result: GuessResponse;
}

export default function GuessRow({ result }: GuessRowProps) {
  const { guess, feedback, is_correct } = result;
  return (
    <div className="grid grid-cols-7 gap-1 md:gap-1.5">
      <Cell
        feedback={is_correct ? "match" : "miss"}
        value={guess.name}
        winName={is_correct}
      />
      <Cell feedback={feedback.gender} value={guess.gender} />
      <Cell
        feedback={feedback.age}
        value={guess.age === null ? "—" : String(guess.age)}
      />
      <Cell feedback={feedback.class_role} value={guess.class_role} />
      <Cell feedback={feedback.weapon} value={guess.weapon} />
      <Cell
        feedback={feedback.element}
        value={guess.element.length ? guess.element.join(", ") : "—"}
      />
      <Cell
        feedback={feedback.act_introduced}
        value={String(guess.act_introduced)}
      />
    </div>
  );
}
