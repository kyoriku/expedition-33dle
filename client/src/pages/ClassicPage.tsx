import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import AnswerRevealBase from "../components/AnswerRevealBase";
import GameStatus from "../components/GameStatus";
import Header from "../components/Header";
import LoadingSpinner from "../components/LoadingSpinner";
import Legend from "../components/Legend";
import GuessGridBase from "../components/GuessGridBase";
import GuessError from "../components/GuessError";
import GuessInput from "../components/GuessInput";
import HowToPlayBase from "../components/HowToPlayBase";
import { CLASSIC_GRID_TEMPLATE } from "../lib/gridTemplates";
import { ATTRIBUTES } from "../lib/attributes";
import Modal from "../components/Modal";
import { ApiError, fetchToday, revealAnswer, submitGuess } from "../lib/api";
import { buildShareString } from "../lib/share";
import { CLASSIC_MAX_GUESSES as MAX_GUESSES, recordGame } from "../lib/stats";
import { msToNextUtcMidnight, todayUtcISO } from "../lib/time";
import { usePageHead } from "../lib/usePageHead";
import StatsBlock from "../components/StatsBlock";
import Histogram from "../components/Histogram";
import Countdown from "../components/Countdown";
import LastTryBase from "../components/LastTryBase";
import {
  loadState,
  loadStats,
  saveState,
  saveStats,
} from "../lib/storage";
import type {
  Character,
  ClassicGuessFeedback,
  GameStatus as Status,
  ClassicGuessResponse,
  ClassicTodayResponse,
} from "../lib/types";

// Synthetic example — fabricated feedback tied to no real puzzle, chosen to
// demonstrate every color state plus a directional arrow. (Drives the How-to grid.)
const EXAMPLE_GUESS: ClassicGuessResponse = {
  guess: {
    id: 0,
    name: "Gustave",
    gender: "Male",
    role: "Playable",
    weapon: "Sword & Pistol",
    element: ["Lightning"],
    act_introduced: 1,
    category: "Human",
    affiliation: ["Expedition 33"],
    zone: "Lumière",
    image: "gustave.webp",
  },
  feedback: {
    gender: "match",
    role: "miss",
    weapon: "miss",
    element: "partial",
    act_introduced: "higher",
    category: "match",
    affiliation: "miss",
    zone: "miss",
  },
  is_correct: false,
};

/** Spoken summary of a guess outcome for the screen-reader live region. */
function describeGuess(
  result: ClassicGuessResponse,
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
    <div className="text-parchment flex flex-1 items-center justify-center px-4 text-center italic">
      {children}
    </div>
  );
}

/** Pre-game chrome: the header bar (without the puzzle/stats cluster, which needs
 *  loaded data) above a centered status message — keeps the header visible during
 *  the loading and error states. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 md:px-6 md:py-12">
      <Header />
      <Centered>{children}</Centered>
    </main>
  );
}

/** Refetch /api/classic/today when the UTC day rolls over — a timer firing at the next
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

export default function ClassicPage() {
  usePageHead({
    title: "Daily Character | Expedition 33dle",
    description: "Guess today's Clair Obscur: Expedition 33 character. A new character puzzle every day at midnight UTC.",
    path: "/classic",
  });
  // Server state only; game state lives in <Game> + localStorage.
  const { data: today, isPending, error, refetch } = useQuery({
    queryKey: ["today"],
    queryFn: fetchToday,
    staleTime: Infinity,
    retry: 1,
  });
  useDailyRollover(today?.puzzle_date, refetch);

  if (isPending) return <Shell><LoadingSpinner /></Shell>;
  if (error) {
    return (
      <Shell>
        {error instanceof ApiError
          ? error.message
          : "Could not reach the server — refresh to retry"}
      </Shell>
    );
  }
  // Key by puzzle_number so a rollover refetch remounts <Game> fresh for the
  // new day (re-deriving state from localStorage under the new puzzle_date).
  return <Game key={today.puzzle_number} today={today} />;
}

function Game({ today }: { today: ClassicTodayResponse }) {
  // Restore happens synchronously on mount; Game only mounts once /api/classic/today
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
  // Character id of the most recently submitted guess this session — only that
  // row flip-reveals; restored/historical rows render in final state.
  const [animateId, setAnimateId] = useState<number | null>(null);
  // Polite screen-reader announcement of the latest guess outcome (the grid is
  // otherwise silent to assistive tech).
  const [announcement, setAnnouncement] = useState("");
  // Restored from storage once at mount; live fetches are derived from the
  // query below rather than synced into state (avoids set-state-in-effect).
  const [storedAnswer] = useState<Character | null>(() => {
    const stored = loadState(today.puzzle_date);
    return stored?.puzzle_number === today.puzzle_number
      ? (stored.revealed_answer ?? null)
      : null;
  });
  // How-to is opt-in via the header "?" button — not shown automatically.
  const [showHowTo, setShowHowTo] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Fires only on a lost game with no persisted answer. staleTime: Infinity
  // keeps the result fresh forever, so the enabled query never refetches.
  const revealQuery = useQuery({
    queryKey: ["reveal", today.puzzle_date],
    queryFn: () => revealAnswer(guesses.map((g) => g.guess.id)),
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
  }

  function handleGuess(character: Character) {
    if (
      guessMutation.isPending ||
      status !== "in_progress" ||
      guessedIds.has(character.id)
    ) {
      return;
    }
    guessMutation.mutate(character.id);
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 md:px-6 md:py-12">
      <Header
        right={
          <span className="flex items-center gap-2">
            <span className="font-label border-gold/25 bg-panneau text-muted flex items-center gap-1 border px-3 py-1 text-sm tracking-[0.12em] uppercase">
              №<strong className="text-gold tabular-nums">{today.puzzle_number}</strong>
            </span>
            {stats.current_streak > 0 && (
              <span className="font-label border-gold/25 bg-panneau text-muted hidden items-center gap-1 border px-3 py-1 text-sm tracking-[0.12em] uppercase sm:flex">
                Streak<strong className="text-gold tabular-nums">{stats.current_streak}</strong>
              </span>
            )}
            <button
              type="button"
              aria-label="Statistics"
              onClick={() => setShowStats(true)}
              className="border-gold/40 text-gold hover:border-gold-bright hover:text-gold-bright bg-panneau flex h-8 w-8 items-center justify-center border"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4"
                fill="currentColor"
              >
                <rect x="3" y="12" width="4" height="8" />
                <rect x="10" y="7" width="4" height="13" />
                <rect x="17" y="3" width="4" height="17" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="How to play"
              onClick={() => setShowHowTo(true)}
              className="border-gold/40 text-gold hover:border-gold-bright hover:text-gold-bright bg-panneau font-display flex h-8 w-8 items-center justify-center border text-base leading-none font-bold"
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

      <p className="font-serif text-muted mt-2 mb-1 text-center text-base italic md:text-lg">
        Guess today's{" "}
        <span className="text-parchment">Clair Obscur: Expedition 33</span>{" "}
        Character
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
            items={today.characters}
            guessedIds={guessedIds}
            disabled={guessMutation.isPending}
            onSubmit={handleGuess}
          />
          {guessMutation.isError && <GuessError error={guessMutation.error} />}
          {guesses.length > 0 && (
            <>
              <Legend />
              <LastTryBase<Character, ClassicGuessFeedback>
                guess={guesses[guesses.length - 1]}
                attributes={ATTRIBUTES}
              />
            </>
          )}
          <GuessGridBase<Character, ClassicGuessFeedback>
            guesses={guesses}
            attributes={ATTRIBUTES}
            gridTemplate={CLASSIC_GRID_TEMPLATE}
            dir="portraits"
            noun="Character"
            animateId={animateId}
          />
        </>
      ) : (
        <>
          <Legend />
          <GuessGridBase<Character, ClassicGuessFeedback>
            guesses={guesses}
            attributes={ATTRIBUTES}
            gridTemplate={CLASSIC_GRID_TEMPLATE}
            dir="portraits"
            noun="Character"
            animateId={animateId}
          />
          <div className="rule" aria-hidden="true" />
          {status === "lost" && (
            <AnswerRevealBase<Character, ClassicGuessFeedback>
              answer={revealedAnswer}
              attributes={ATTRIBUTES}
              gridTemplate={CLASSIC_GRID_TEMPLATE}
              dir="portraits"
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

      {today.yesterday && (
        <p className="font-label text-muted mt-6 text-center text-sm tracking-[0.12em] uppercase">
          Yesterday ·{" "}
          <span className="text-gold">{today.yesterday.name}</span>
        </p>
      )}

      <Modal
        open={showHowTo}
        onClose={closeHowTo}
        title="How to Play"
        widthClass="sm:max-w-4xl lg:max-w-6xl"
      >
        <HowToPlayBase<Character, ClassicGuessFeedback>
          exampleGuess={EXAMPLE_GUESS}
          attributes={ATTRIBUTES}
          gridTemplate={CLASSIC_GRID_TEMPLATE}
          dir="portraits"
          noun="Character"
          maxGuesses={MAX_GUESSES}
          partialHint="shares some elements"
          directionalHint="Act"
          onClose={closeHowTo}
        />
      </Modal>

      <Modal
        open={showStats}
        onClose={() => setShowStats(false)}
        title="Statistics"
        widthClass="sm:max-w-md"
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
