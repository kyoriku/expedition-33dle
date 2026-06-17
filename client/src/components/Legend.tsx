// Permanent compact key, rendered immediately above the matrix in every game
// state. Mirrors the glyphs the cells now carry so meaning is clear without
// relying on color, and distinguishes element "partial" from age "unknown".
const CHIPS: { bg: string; fg: string; glyph: string; label: string }[] = [
  { bg: "bg-match", fg: "text-parchment", glyph: "✓", label: "Match" },
  { bg: "bg-partial", fg: "text-glyph", glyph: "≈", label: "Partial" },
  { bg: "bg-miss", fg: "text-parchment", glyph: "✗", label: "Miss" },
];

export default function Legend() {
  return (
    <div className="text-muted mt-3 mb-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[9px] tracking-wide uppercase md:text-[10px]">
      {CHIPS.map(({ bg, fg, glyph, label }) => (
        <span key={label} className="flex items-center gap-1">
          <span
            aria-hidden="true"
            className={`${bg} ${fg} inline-flex h-3.5 w-3.5 items-center justify-center rounded-[2px] text-[8px] font-bold`}
          >
            {glyph}
          </span>
          {label}
        </span>
      ))}
      <span className="flex items-center gap-1">
        <span aria-hidden="true">↑↓</span> higher / lower
      </span>
      <span className="flex items-center gap-1">
        <span aria-hidden="true">?</span> unknown
      </span>
    </div>
  );
}
