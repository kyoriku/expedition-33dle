import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import GameStatus from "./components/GameStatus";
import GuessGrid from "./components/GuessGrid";
import GuessInput from "./components/GuessInput";
import HowToPlay from "./components/HowToPlay";
import Modal from "./components/Modal";
import { ApiError, fetchToday, submitGuess } from "./lib/api";
import { buildShareString } from "./lib/share";
import { recordGame } from "./lib/stats";
import {
  loadState,
  loadStats,
  loadTutorialSeen,
  saveState,
  saveStats,
  saveTutorialSeen,
} from "./lib/storage";
import type {
  Entity,
  GameStatus as Status,
  TodayResponse,
} from "./lib/types";

const MAX_GUESSES = 6;

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-ink text-parchment flex min-h-screen items-center justify-center px-4 text-center text-sm italic">
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
  const [statsRecorded, setStatsRecorded] = useState(() => {
    const stored = loadState(today.puzzle_date);
    return stored?.puzzle_number === today.puzzle_number
      ? stored.stats_recorded
      : false;
  });
  const [stats, setStats] = useState(loadStats);
  // Auto-show the tutorial on first visit (Wordle convention)
  const [showHowTo, setShowHowTo] = useState(() => !loadTutorialSeen());

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

      let nextRecorded = statsRecorded;
      if (
        (nextStatus === "won" || nextStatus === "lost") &&
        !statsRecorded
      ) {
        const nextStats = recordGame(stats, {
          puzzle_number: today.puzzle_number,
          puzzle_date: today.puzzle_date,
          status: nextStatus,
          guess_count: nextGuesses.length,
        });
        saveStats(nextStats);
        setStats(nextStats);
        nextRecorded = true;
        setStatsRecorded(true);
      }

      saveState(today.puzzle_date, {
        guesses: nextGuesses,
        status: nextStatus,
        puzzle_number: today.puzzle_number,
        stats_recorded: nextRecorded,
      });
    },
  });

  const guessedIds = useMemo(
    () => new Set(guesses.map((g) => g.guess.id)),
    [guesses],
  );

  const shareText = useMemo(
    () =>
      status === "in_progress"
        ? null
        : buildShareString(guesses, today.puzzle_number, status),
    [guesses, status, today.puzzle_number],
  );

  function closeHowTo() {
    setShowHowTo(false);
    saveTutorialSeen();
  }

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
    <div className="bg-ink text-parchment min-h-screen">
      <div className="grain" aria-hidden="true" />
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-2 py-4 md:max-w-xl md:px-4 md:py-8 lg:max-w-2xl">
        {/* lg:mt-auto opposes the footer's mt-auto, vertically centering the
            game block on desktop while keeping the footer pinned */}
        <header className="mb-1.5 flex items-baseline justify-between lg:mt-auto">
          <h1 className="font-serif text-2xl font-extrabold tracking-wide md:text-4xl lg:text-[2.75rem]">
            Expedition <span className="text-gold">33dle</span>
          </h1>
          <span className="text-muted flex items-center gap-2 text-[11px] tracking-[0.12em] uppercase md:text-[13px]">
            № {today.puzzle_number}
            <button
              type="button"
              aria-label="How to play"
              onClick={() => setShowHowTo(true)}
              className="border-gold text-gold hover:border-gold-bright hover:text-gold-bright flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold"
            >
              ?
            </button>
          </span>
        </header>
        <div className="rule" aria-hidden="true" />

        <GameStatus
          status={status}
          guessCount={guesses.length}
          remaining={MAX_GUESSES - guesses.length}
          stats={stats}
          shareText={shareText}
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

        <footer className="mt-auto pt-8 lg:pt-10">
          <div className="rule" aria-hidden="true" />
          <p className="text-muted mt-2 text-center text-[10px] tracking-[0.15em] uppercase">
            expedition33dle.com · an unofficial fan game
          </p>
        </footer>

        <Modal open={showHowTo} onClose={closeHowTo} title="How to Play">
          <HowToPlay onClose={closeHowTo} />
        </Modal>
      </main>
    </div>
  );
}
