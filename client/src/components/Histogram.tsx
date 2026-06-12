interface HistogramProps {
  distribution: number[]; // wins by guess count, index 0 = 1 guess
  highlight: number | null; // current game's guess count (won games only)
}

export default function Histogram({ distribution, highlight }: HistogramProps) {
  const max = Math.max(...distribution, 1);
  return (
    <div className="mt-3">
      <h2 className="mb-1 text-center text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">
        Guess distribution
      </h2>
      <div className="flex flex-col gap-1">
        {distribution.map((count, i) => (
          <div key={i} className="flex items-center gap-1 text-[10px]">
            <span className="w-3 text-right text-zinc-400">{i + 1}</span>
            <div
              className={`flex h-4 items-center justify-end rounded-sm px-1 font-semibold text-white ${
                highlight === i + 1 ? "bg-green-600" : "bg-zinc-600"
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
