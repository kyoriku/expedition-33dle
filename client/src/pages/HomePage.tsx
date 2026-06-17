import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import AnswerReveal from "../components/AnswerReveal";
import GameStatus from "../components/GameStatus";
import Header from "../components/Header";
import Legend from "../components/Legend";
import GuessGrid from "../components/GuessGrid";
import GuessInput from "../components/GuessInput";
import HowToPlay from "../components/HowToPlay";
import Modal from "../components/Modal";
import { ApiError, fetchToday, revealAnswer, submitGuess } from "../lib/api";
import { buildShareString } from "../lib/share";
import { recordGame } from "../lib/stats";
import { msToNextUtcMidnight, todayUtcISO } from "../lib/time";
import StatsBlock from "../components/StatsBlock";
import Histogram from "../components/Histogram";
import Countdown from "../components/Countdown";
import {
  loadState,
  loadStats,
  loadTutorialSeen,
  saveState,
  saveStats,
  saveTutorialSeen,
} from "../lib/storage";
import type {
  Entity,
  GameStatus as Status,
  GuessResponse,
  TodayResponse,
} from "../lib/types";

const MAX_GUESSES = 6;

/** Spoken summary of a guess outcome for the screen-reader live region. */
function describeGuess(
  result: GuessResponse,
  guessNumber: number,
  status: Status,
): string {
  const head = `Guess ${guessNumber}: ${result.guess.name}.`;
  if (result.is_correct) {
    return `${head} Correct! Solved in ${guessNumber} ${
      guessNumber === 1 ? "guess" : "guesses"
    }.`;
  }
  const fields = Object.values(result.feedback);
  const matches = fields.filter((s) => s === "match").length;
  const body = `${matches} of ${fields.length} attributes match.`;
  return status === "lost"
    ? `${head} ${body} Out of guesses — the answer is shown below.`
    : `${head} ${body} Not the answer.`;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-parchment flex flex-1 items-center justify-center px-4 text-center text-sm italic">
      {children}
    </div>
  );
}

/** Refetch /api/today when the UTC day rolls over — a timer firing at the next
 *  midnight plus a check on tab refocus. Without this, a long-open session keeps
 *  serving yesterday's puzzle (staleTime: Infinity) and would score new guesses
 *  against the *new* day's answer. The +500ms cushions clock skew so the server
 *  has definitely ticked over. */
function useDailyRollover(puzzleDate: string | undefined, refetch: () => void) {
  useEffect(() => {
    if (!puzzleDate) return;
    const timer = setTimeout(refetch, msToNextUtcMidnight() + 500);
    function onVisible() {
      if (
        document.visibilityState === "visible" &&
        todayUtcISO() !== puzzleDate
      ) {
        refetch();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [puzzleDate, refetch]);
}

export default function HomePage() {
  // Server state only; game state lives in <Game> + localStorage.
  const { data: today, isPending, error, refetch } = useQuery({
    queryKey: ["today"],
    queryFn: fetchToday,
    staleTime: Infinity,
    retry: 1,
  });
  useDailyRollover(today?.puzzle_date, refetch);

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
  // Key by puzzle_number so a rollover refetch remounts <Game> fresh for the
  // new day (re-deriving state from localStorage under the new puzzle_date).
  return <Game key={today.puzzle_number} today={today} />;
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
  // Entity id of the most recently submitted guess this session — only that
  // row flip-reveals; restored/historical rows render in final state.
  const [animateId, setAnimateId] = useState<number | null>(null);
  // Polite screen-reader announcement of the latest guess outcome (the grid is
  // otherwise silent to assistive tech).
  const [announcement, setAnnouncement] = useState("");
  // Restored from storage once at mount; live fetches are derived from the
  // query below rather than synced into state (avoids set-state-in-effect).
  const [storedAnswer] = useState<Entity | null>(() => {
    const stored = loadState(today.puzzle_date);
    return stored?.puzzle_number === today.puzzle_number
      ? (stored.revealed_answer ?? null)
      : null;
  });
  // Auto-show the tutorial on first visit (Wordle convention)
  const [showHowTo, setShowHowTo] = useState(() => !loadTutorialSeen());
  const [showStats, setShowStats] = useState(false);

  // Fires only on a lost game with no persisted answer. staleTime: Infinity
  // keeps the result fresh forever, so the enabled query never refetches.
  const revealQuery = useQuery({
    queryKey: ["reveal", today.puzzle_date],
    queryFn: revealAnswer,
    enabled: status === "lost" && storedAnswer === null,
    staleTime: Infinity,
    retry: 1,
  });
  const revealedAnswer = storedAnswer ?? revealQuery.data ?? null;

  // RQ v5 has no onSuccess on useQuery — persist via effect (idempotent:
  // re-runs write the same JSON).
  useEffect(() => {
    if (status === "lost" && storedAnswer === null && revealQuery.data) {
      saveState(today.puzzle_date, {
        guesses,
        status,
        puzzle_number: today.puzzle_number,
        stats_recorded: statsRecorded,
        revealed_answer: revealQuery.data,
      });
    }
  }, [revealQuery.data, storedAnswer, guesses, status, statsRecorded, today]);

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
      setAnimateId(result.guess.id);
      setAnnouncement(describeGuess(result, nextGuesses.length, nextStatus));

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
        revealed_answer: revealedAnswer,
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8 md:max-w-xl md:px-4 md:py-8 lg:max-w-[752px] lg:justify-center">
      <Header
        right={
          <span className="text-muted flex items-center gap-2 text-[11px] tracking-[0.12em] uppercase md:text-[13px]">
            № {today.puzzle_number}
            {stats.current_streak > 0 && (
              <span>· Streak {stats.current_streak}</span>
            )}
            <button
              type="button"
              aria-label="Statistics"
              onClick={() => setShowStats(true)}
              className="border-gold text-gold hover:border-gold-bright hover:text-gold-bright flex h-6 w-6 items-center justify-center rounded-full border"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-3 w-3"
                fill="currentColor"
              >
                <rect x="3" y="12" width="4" height="8" rx="1" />
                <rect x="10" y="7" width="4" height="13" rx="1" />
                <rect x="17" y="3" width="4" height="17" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="How to play"
              onClick={() => setShowHowTo(true)}
              className="border-gold text-gold hover:border-gold-bright hover:text-gold-bright flex h-6 w-6 items-center justify-center rounded-full border text-xs leading-none font-bold tracking-normal"
            >
              ?
            </button>
          </span>
        }
      />

      {/* Politely announces each guess outcome to assistive tech. */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {status === "in_progress" ? (
        <>
          <GameStatus
            status={status}
            guessCount={guesses.length}
            remaining={MAX_GUESSES - guesses.length}
            stats={stats}
            shareText={shareText}
          />
          <GuessInput
            entities={today.entities}
            guessedIds={guessedIds}
            disabled={guessMutation.isPending}
            onSubmit={handleGuess}
          />
          {guessMutation.isError && (
            <p className="mt-2 rounded-md bg-red-900/60 p-2 text-center text-xs text-red-200">
              {guessMutation.error instanceof ApiError
                ? guessMutation.error.message
                : "Guess failed — check your connection and try again"}
            </p>
          )}
          <Legend />
          <GuessGrid guesses={guesses} animateId={animateId} />
        </>
      ) : (
        <>
          <Legend />
          <GuessGrid guesses={guesses} animateId={animateId} />
          <div className="rule" aria-hidden="true" />
          {status === "lost" && (
            <AnswerReveal
              answer={revealedAnswer}
              isError={revealQuery.isError}
              onRetry={() => revealQuery.refetch()}
            />
          )}

          <GameStatus
            status={status}
            guessCount={guesses.length}
            remaining={MAX_GUESSES - guesses.length}
            stats={stats}
            shareText={shareText}
          />
        </>
      )}

      <Modal open={showHowTo} onClose={closeHowTo} title="How to Play">
        <HowToPlay onClose={closeHowTo} />
      </Modal>

      <Modal
        open={showStats}
        onClose={() => setShowStats(false)}
        title="Statistics"
      >
        <StatsBlock stats={stats} />
        <Histogram
          distribution={stats.guess_distribution}
          highlight={status === "won" ? guesses.length : null}
        />
        <Countdown />
      </Modal>
    </main>
  );
}
