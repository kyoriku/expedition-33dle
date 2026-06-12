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
        <div
          key={label}
          className="bg-surface border-line rounded-md border p-2"
        >
          <div className="font-serif text-lg font-bold md:text-2xl">
            {value}
          </div>
          <div className="text-muted text-[9px] tracking-wide uppercase md:text-[10px]">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
