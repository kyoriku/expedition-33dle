interface HistogramProps {
  distribution: number[]; // wins by guess count, index 0 = 1 guess
  highlight: number | null; // current game's guess count (won games only)
}

export default function Histogram({ distribution, highlight }: HistogramProps) {
  const max = Math.max(...distribution, 1);
  return (
    <div className="mt-3">
      <h2 className="font-label text-muted mb-1 text-center text-sm tracking-[0.12em] uppercase">
        Guess distribution
      </h2>
      <div className="flex flex-col gap-1">
        {distribution.map((count, i) => (
          <div key={i} className="flex items-center gap-1 text-sm">
            <span className="text-muted w-3 text-sm text-right">{i + 1}</span>
            <div
              className={`text-parchment flex h-5 items-center justify-end rounded-sm px-1 md:h-6 font-semibold ${
                highlight === i + 1 ? "bg-match" : "bg-raised"
              }`}
              // min 8% stub keeps zero-count bars visible
              style={{ width: `${Math.max((count / max) * 100, 8)}%` }}
            >
              {count}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
