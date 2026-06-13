// Permanent compact color legend, rendered immediately above the matrix in
// every game state.
export default function Legend() {
  const chips: [string, string][] = [
    ["bg-match", "Match"],
    ["bg-partial", "Partial"],
    ["bg-miss", "Incorrect"],
  ];
  return (
    <div className="text-muted mt-3 mb-1 flex items-center justify-center gap-3 text-[9px] tracking-wide uppercase md:text-[10px]">
      {chips.map(([bg, label]) => (
        <span key={label} className="flex items-center gap-1">
          <span
            className={`${bg} inline-block h-2 w-2 rounded-[2px]`}
            aria-hidden="true"
          />
          {label}
        </span>
      ))}
      <span>↑↓ answer higher/lower</span>
    </div>
  );
}
