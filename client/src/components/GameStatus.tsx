import type { GameStatus as Status } from "../lib/types";

interface GameStatusProps {
  status: Status;
  guessCount: number;
  remaining: number;
}

export default function GameStatus({
  status,
  guessCount,
  remaining,
}: GameStatusProps) {
  if (status === "won") {
    return (
      <p className="my-3 rounded-md bg-green-700 p-3 text-center text-sm font-semibold text-white">
        Solved in {guessCount} {guessCount === 1 ? "guess" : "guesses"}!
      </p>
    );
  }
  if (status === "lost") {
    return (
      <p className="my-3 rounded-md bg-zinc-700 p-3 text-center text-sm font-semibold text-zinc-100">
        Game over, try again tomorrow
      </p>
    );
  }
  return (
    <p className="my-3 text-center text-xs text-zinc-400">
      {remaining} {remaining === 1 ? "guess" : "guesses"} left
    </p>
  );
}
