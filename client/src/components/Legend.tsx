import { STATE_GLYPH, STATE_VISUAL, type CellState } from "../lib/attributes";

// Permanent compact key above the matrix. Mirrors the glyphs the cells carry so
// meaning is clear without color (match ✓ / partial ≈ / miss ✗).
const ITEMS: { state: CellState; label: string }[] = [
  { state: "match", label: "Match" },
  { state: "partial", label: "Partial" },
  { state: "miss", label: "Miss" },
];

export default function Legend() {
  return (
    <div className="font-label text-muted mt-3 mb-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs tracking-[0.12em] uppercase md:text-sm">
      {ITEMS.map(({ state, label }) => (
        <span key={label} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`${STATE_VISUAL[state].swatch} inline-flex h-5 w-5 items-center justify-center text-[12px] font-bold`}
          >
            {STATE_GLYPH[state]}
          </span>
          {label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true">▲▼</span> higher / lower
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true">?</span> unknown
      </span>
    </div>
  );
}
