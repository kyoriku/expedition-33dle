import type { GameStatus as Status, Stats } from "../lib/types";
import Countdown from "./Countdown";
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
      <p className="font-serif text-muted my-3 text-center text-sm italic md:text-base">
        {remaining} {remaining === 1 ? "guess" : "guesses"} left
      </p>
    );
  }

  return (
    // Compact, readable end-game column (matches the stats modal width).
    <div className="mx-auto w-full max-w-md">
      {status === "won" ? (
        <p className="bg-linear-to-b from-match to-match/80 border-match-edge text-parchment win-pop font-display my-3 border p-3 text-center text-base tracking-[0.08em] uppercase md:text-lg">
          Solved in {guessCount} {guessCount === 1 ? "guess" : "guesses"}
        </p>
      ) : (
        <p className="bg-panneau border-line text-parchment font-display my-3 border p-3 text-center text-base tracking-[0.08em] uppercase md:text-lg">
          Game over
          <span className="hidden sm:inline"> — </span>
          <span className="block sm:inline">try again tomorrow</span>
        </p>
      )}
      <StatsBlock stats={stats} />
      <Histogram
        distribution={stats.guess_distribution}
        highlight={status === "won" ? guessCount : null}
      />
      {shareText !== null && <ShareButton text={shareText} />}
      <Countdown />
    </div>
  );
}
