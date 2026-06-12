import type { Stats } from "../lib/types";

interface StatsBlockProps {
  stats: Stats;
}

export default function StatsBlock({ stats }: StatsBlockProps) {
  const winPct = stats.played
    ? Math.round((stats.won / stats.played) * 100)
    : 0;
  const cells: [string | number, string][] = [
    [stats.played, "Played"],
    [`${winPct}%`, "Win %"],
    [stats.current_streak, "Streak"],
    [stats.max_streak, "Max streak"],
  ];
  return (
    <div className="grid grid-cols-4 gap-1 text-center">
      {cells.map(([value, label]) => (
        <div key={label} className="rounded-md bg-zinc-800 p-2">
          <div className="text-lg font-bold">{value}</div>
          <div className="text-[9px] tracking-wide text-zinc-400 uppercase">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
