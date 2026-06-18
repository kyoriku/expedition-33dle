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
        <div key={label} className="bg-panneau border-line border p-2">
          <div className="font-display text-gold text-xl md:text-2xl">
            {value}
          </div>
          <div className="font-label text-muted text-[11px] tracking-[0.1em] uppercase md:text-xs">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
