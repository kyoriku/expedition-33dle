import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import GameStatus from "./components/GameStatus";
import GuessGrid from "./components/GuessGrid";
import GuessInput from "./components/GuessInput";
import { ApiError, fetchToday, submitGuess } from "./lib/api";
import { loadState, saveState } from "./lib/storage";
import type {
  Entity,
  GameStatus as Status,
  TodayResponse,
} from "./lib/types";

const MAX_GUESSES = 6;

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900 px-4 text-center text-sm text-zinc-300">
      {children}
    </div>
  );
}

export default function App() {
  // Server state only; game state lives in <Game> + localStorage.
  const { data: today, isPending, error } = useQuery({
    queryKey: ["today"],
    queryFn: fetchToday,
    staleTime: Infinity,
    retry: 1,
  });

  if (isPending) return <Centered>Loading today’s puzzle…</Centered>;
  if (error) {
    return (
      <Centered>
        {error instanceof ApiError
          ? error.message
          : "Could not reach the server — refresh to retry"}
      </Centered>
    );
  }
  return <Game today={today} />;
}

function Game({ today }: { today: TodayResponse }) {
  // Restore happens synchronously on mount; Game only mounts once /api/today
  // has resolved, so the stored puzzle_number is always validated against
  // live data. A mismatch (new day, reseeded DB) starts fresh.
  const [guesses, setGuesses] = useState(() => {
    const stored = loadState(today.puzzle_date);
    return stored?.puzzle_number === today.puzzle_number ? stored.guesses : [];
  });
  const [status, setStatus] = useState<Status>(() => {
    const stored = loadState(today.puzzle_date);
    return stored?.puzzle_number === today.puzzle_number
      ? stored.status
      : "in_progress";
  });

  const guessMutation = useMutation({
    mutationFn: submitGuess,
    onSuccess: (result) => {
      const nextGuesses = [...guesses, result];
      const nextStatus: Status = result.is_correct
        ? "won"
        : nextGuesses.length >= MAX_GUESSES
          ? "lost"
          : "in_progress";
      setGuesses(nextGuesses);
      setStatus(nextStatus);
      saveState(today.puzzle_date, {
        guesses: nextGuesses,
        status: nextStatus,
        puzzle_number: today.puzzle_number,
      });
    },
  });

  const guessedIds = useMemo(
    () => new Set(guesses.map((g) => g.guess.id)),
    [guesses],
  );

  function handleGuess(entity: Entity) {
    if (
      guessMutation.isPending ||
      status !== "in_progress" ||
      guessedIds.has(entity.id)
    ) {
      return;
    }
    guessMutation.mutate(entity.id);
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <main className="mx-auto w-full max-w-md px-2 py-4">
        <header className="mb-2 flex items-baseline justify-between">
          <h1 className="text-lg font-bold">Expedition 33dle</h1>
          <span className="text-sm text-zinc-400">
            Puzzle #{today.puzzle_number}
          </span>
        </header>

        <GameStatus
          status={status}
          guessCount={guesses.length}
          remaining={MAX_GUESSES - guesses.length}
        />

        {status === "in_progress" && (
          <GuessInput
            entities={today.entities}
            guessedIds={guessedIds}
            disabled={guessMutation.isPending}
            onSubmit={handleGuess}
          />
        )}

        {guessMutation.isError && (
          <p className="mt-2 rounded-md bg-red-900/60 p-2 text-center text-xs text-red-200">
            {guessMutation.error instanceof ApiError
              ? guessMutation.error.message
              : "Guess failed — check your connection and try again"}
          </p>
        )}

        <GuessGrid guesses={guesses} />
      </main>
    </div>
  );
}
