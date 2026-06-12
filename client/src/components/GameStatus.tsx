import type { GameStatus as Status, Stats } from "../lib/types";
import Histogram from "./Histogram";
import ShareButton from "./ShareButton";
import StatsBlock from "./StatsBlock";

interface GameStatusProps {
  status: Status;
  guessCount: number;
  remaining: number;
  stats: Stats;
  shareText: string | null; // non-null only on game over
}

export default function GameStatus({
  status,
  guessCount,
  remaining,
  stats,
  shareText,
}: GameStatusProps) {
  if (status === "in_progress") {
    return (
      <p className="my-3 text-center text-xs text-zinc-400">
        {remaining} {remaining === 1 ? "guess" : "guesses"} left
      </p>
    );
  }

  return (
    <div>
      {status === "won" ? (
        <p className="my-3 rounded-md bg-green-700 p-3 text-center text-sm font-semibold text-white">
          Solved in {guessCount} {guessCount === 1 ? "guess" : "guesses"}!
        </p>
      ) : (
        <p className="my-3 rounded-md bg-zinc-700 p-3 text-center text-sm font-semibold text-zinc-100">
          Game over, try again tomorrow
        </p>
      )}
      <StatsBlock stats={stats} />
      <Histogram
        distribution={stats.guess_distribution}
        highlight={status === "won" ? guessCount : null}
      />
      {shareText !== null && <ShareButton text={shareText} />}
    </div>
  );
}
