import type { GuessResponse } from "../lib/types";

type CellFeedback = "match" | "partial" | "miss" | "higher" | "lower" | "unknown";

const CELL_STYLES: Record<CellFeedback, string> = {
  match: "bg-green-600 text-white",
  partial: "bg-yellow-500 text-zinc-900", // element only
  unknown: "bg-yellow-500 text-zinc-900", // age only — rendered with "?"
  miss: "bg-zinc-600 text-zinc-100",
  higher: "bg-zinc-600 text-zinc-100", // directional non-match = gray + arrow
  lower: "bg-zinc-600 text-zinc-100",
};

const CELL_GLYPHS: Partial<Record<CellFeedback, string>> = {
  higher: "↑",
  lower: "↓",
  unknown: "?",
};

const CELL_BASE =
  "flex min-h-12 flex-col items-center justify-center rounded-sm p-1 " +
  "text-center text-[10px] leading-tight break-words";

function Cell({ feedback, value }: { feedback: CellFeedback; value: string }) {
  const glyph = CELL_GLYPHS[feedback];
  return (
    <div className={`${CELL_BASE} ${CELL_STYLES[feedback]}`}>
      <span className="max-w-full">{value}</span>
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
    <div className="grid grid-cols-7 gap-1">
      <Cell feedback={is_correct ? "match" : "miss"} value={guess.name} />
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
