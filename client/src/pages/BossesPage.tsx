import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Header from "../components/Header";
import Legend from "../components/Legend";
import Modal from "../components/Modal";
import Countdown from "../components/Countdown";
import GuessError from "../components/GuessError";
import GuessInput from "../components/GuessInput";
import GuessGridBase from "../components/GuessGridBase";
import LastTryBase from "../components/LastTryBase";
import AnswerRevealBase from "../components/AnswerRevealBase";
import HowToPlayBase from "../components/HowToPlayBase";
import { BOSSES_GRID_TEMPLATE } from "../lib/gridTemplates";
import { BOSSES_ATTRIBUTES } from "../lib/attributes";
import StatsBlock from "../components/StatsBlock";
import Histogram from "../components/Histogram";
import ShareButton from "../components/ShareButton";
import { ApiError, getBossesToday, revealBoss, submitBossGuess } from "../lib/api";
import { buildBossesShareString } from "../lib/share";
import { msToNextUtcMidnight, todayUtcISO } from "../lib/time";
import { usePageTitle } from "../lib/usePageTitle";
import { BOSSES_MAX_GUESSES as MAX_GUESSES, recordGame } from "../lib/stats";
import {
  loadBossesState,
  loadBossesStats,
  saveBossesState,
  saveBossesStats,
} from "../lib/storage";
import type {
  GameStatus as Status,
  Boss,
  BossGuessFeedback,
  BossGuessResponse,
  BossTodayResponse,
} from "../lib/types";

// Synthetic example — real boss (Goblu) with fabricated feedback tied to no real
// puzzle, chosen to demonstrate every color state plus a directional arrow.
// (Drives the How-to grid.)
const EXAMPLE_GUESS: BossGuessResponse = {
  guess: {
    id: 0,
    name: "Goblu",
    weakness: ["Lightning"],
    resistance: ["Ice", "Dark"],
    category: "Nevron",
    location: "Flying Waters",
    encounter: "Required",
    act_introduced: 1,
    image: null,
  },
  feedback: {
    weakness: "match",
    resistance: "partial",
    category: "match",
    location: "miss",
    encounter: "miss",
    act_introduced: "higher",
  },
  is_correct: false,
};

/** Spoken summary of a guess outcome for the screen-reader live region. */
function describeGuess(
  result: BossGuessResponse,
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

// ── PROTOTYPE: constraint-propagation autocomplete (greens-only) ─────────────
// Narrow the suggestion roster to bosses consistent with every confirmed
// EXACT-match (green) column. Display-only over data the page already holds —
// the answer always satisfies its own greens, so this can never hide it. Only the
// equality columns: location, encounter, category. NOT the directional (act) or
// set/partial (weakness/resistance) columns. To revert: delete this block + the
// suggestItems memo and restore items={today.bosses}.
type BossConstraints = { location?: string; encounter?: string; category?: string };

function deriveConstraints(guesses: BossGuessResponse[]): BossConstraints {
  const c: BossConstraints = {};
  for (const { guess, feedback } of guesses) {
    if (feedback.location === "match") c.location = guess.location;
    if (feedback.encounter === "match") c.encounter = guess.encounter;
    if (feedback.category === "match") c.category = guess.category;
  }
  return c;
}

function matchesConstraints(b: Boss, c: BossConstraints): boolean {
  if (c.location !== undefined && b.location !== c.location) return false;
  if (c.encounter !== undefined && b.encounter !== c.encounter) return false;
  if (c.category !== undefined && b.category !== c.category) return false;
  return true;
}
// ── end PROTOTYPE ────────────────────────────────────────────────────────────

/** Pre-game chrome: the header bar (without the puzzle/stats cluster, which needs
 *  loaded data) above a centered status message — keeps the header visible during
 *  the loading and error states. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 md:py-12 md:max-w-3xl md:px-6 lg:max-w-6xl">
      <Header />
      <Centered>{children}</Centered>
    </main>
  );
}

/** Refetch /api/bosses/today when the UTC day rolls over — a timer firing at the
 *  next midnight plus a check on tab refocus. Parallels PictosPage's
 *  usePictosRollover (duplicated to keep the other pages untouched). */
function useBossesRollover(puzzleDate: string | undefined, refetch: () => void) {
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

export default function BossesPage() {
  usePageTitle("Daily Boss | Expedition33dle");
  const { data: today, isPending, error, refetch } = useQuery({
    queryKey: ["bosses-today"],
    queryFn: getBossesToday,
    staleTime: Infinity,
    retry: 1,
  });
  useBossesRollover(today?.puzzle_date, refetch);

  if (isPending) return <Shell>Loading today’s puzzle…</Shell>;
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

function Game({ today }: { today: BossTodayResponse }) {
  // Restore happens synchronously on mount; Game only mounts once
  // /api/bosses/today has resolved, so the stored puzzle_number is validated
  // against live data. A mismatch (new day, reseeded DB) starts fresh.
  const [guesses, setGuesses] = useState<BossGuessResponse[]>(() => {
    const stored = loadBossesState(today.puzzle_date);
    return stored?.puzzle_number === today.puzzle_number ? stored.guesses : [];
  });
  const [status, setStatus] = useState<Status>(() => {
    const stored = loadBossesState(today.puzzle_date);
    return stored?.puzzle_number === today.puzzle_number
      ? stored.status
      : "in_progress";
  });
  const [animateId, setAnimateId] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [storedAnswer] = useState<Boss | null>(() => {
    const stored = loadBossesState(today.puzzle_date);
    return stored?.puzzle_number === today.puzzle_number
      ? (stored.revealed_answer ?? null)
      : null;
  });
  // How-to is opt-in via the header "?" button — not shown automatically.
  const [showHowTo, setShowHowTo] = useState(false);
  const [stats, setStats] = useState(loadBossesStats);
  const [statsRecorded, setStatsRecorded] = useState(() => {
    const stored = loadBossesState(today.puzzle_date);
    return stored?.puzzle_number === today.puzzle_number
      ? stored.stats_recorded
      : false;
  });
  const [showStats, setShowStats] = useState(false);

  // Fires only on a lost game with no persisted answer. staleTime: Infinity
  // keeps the result fresh forever, so the enabled query never refetches.
  const revealQuery = useQuery({
    queryKey: ["bosses-reveal", today.puzzle_date],
    queryFn: () => revealBoss(guesses.map((g) => g.guess.id)),
    enabled: status === "lost" && storedAnswer === null,
    staleTime: Infinity,
    retry: 1,
  });
  const revealedAnswer = storedAnswer ?? revealQuery.data ?? null;

  useEffect(() => {
    if (status === "lost" && storedAnswer === null && revealQuery.data) {
      saveBossesState(today.puzzle_date, {
        guesses,
        status,
        puzzle_number: today.puzzle_number,
        stats_recorded: statsRecorded,
        revealed_answer: revealQuery.data,
      });
    }
  }, [revealQuery.data, storedAnswer, guesses, status, statsRecorded, today]);

  const guessMutation = useMutation({
    mutationFn: submitBossGuess,
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

      // Record cumulative stats exactly once per finished game.
      let nextRecorded = statsRecorded;
      if ((nextStatus === "won" || nextStatus === "lost") && !statsRecorded) {
        const nextStats = recordGame(stats, {
          puzzle_number: today.puzzle_number,
          puzzle_date: today.puzzle_date,
          status: nextStatus,
          guess_count: nextGuesses.length,
        });
        saveBossesStats(nextStats);
        setStats(nextStats);
        nextRecorded = true;
        setStatsRecorded(true);
      }

      saveBossesState(today.puzzle_date, {
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

  // PROTOTYPE (see deriveConstraints above): filter suggestions to bosses that
  // satisfy every green so far. Defensive fallback to the full roster if that ever
  // empties mid-game (shouldn't — the answer satisfies its own greens).
  const suggestItems = useMemo(() => {
    const filtered = today.bosses.filter((b) =>
      matchesConstraints(b, deriveConstraints(guesses)),
    );
    return filtered.length ? filtered : today.bosses;
  }, [guesses, today.bosses]);

  const shareText = useMemo(
    () =>
      status === "in_progress"
        ? null
        : buildBossesShareString(guesses, today.puzzle_number, status),
    [guesses, status, today.puzzle_number],
  );

  function closeHowTo() {
    setShowHowTo(false);
  }

  function handleGuess(boss: Boss) {
    if (
      guessMutation.isPending ||
      status !== "in_progress" ||
      guessedIds.has(boss.id)
    ) {
      return;
    }
    guessMutation.mutate(boss.id);
  }

  const remaining = MAX_GUESSES - guesses.length;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 md:py-12 md:max-w-3xl md:px-6 lg:max-w-6xl">
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
        <span className="text-parchment">Clair Obscur: Expedition 33</span> Boss
      </p>

      {status === "in_progress" ? (
        <>
          <p className="font-serif text-muted my-3 text-center text-sm italic md:text-base">
            {remaining} {remaining === 1 ? "guess" : "guesses"} left
          </p>
          <GuessInput
            items={suggestItems}
            guessedIds={guessedIds}
            disabled={guessMutation.isPending}
            onSubmit={handleGuess}
            noun="Boss"
          />
          {guessMutation.isError && <GuessError error={guessMutation.error} />}
          {guesses.length > 0 && (
            <>
              <Legend />
              <LastTryBase<Boss, BossGuessFeedback>
                guess={guesses[guesses.length - 1]}
                attributes={BOSSES_ATTRIBUTES}
              />
            </>
          )}
          <GuessGridBase<Boss, BossGuessFeedback>
            guesses={guesses}
            attributes={BOSSES_ATTRIBUTES}
            gridTemplate={BOSSES_GRID_TEMPLATE}
            dir="bosses"
            noun="Boss"
            animateId={animateId}
          />
        </>
      ) : (
        <>
          <Legend />
          <GuessGridBase<Boss, BossGuessFeedback>
            guesses={guesses}
            attributes={BOSSES_ATTRIBUTES}
            gridTemplate={BOSSES_GRID_TEMPLATE}
            dir="bosses"
            noun="Boss"
            animateId={animateId}
          />
          <div className="rule" aria-hidden="true" />
          {status === "lost" && (
            <AnswerRevealBase<Boss, BossGuessFeedback>
              answer={revealedAnswer}
              attributes={BOSSES_ATTRIBUTES}
              gridTemplate={BOSSES_GRID_TEMPLATE}
              dir="bosses"
              isError={revealQuery.isError}
              onRetry={() => revealQuery.refetch()}
            />
          )}

          {/* Outcome banner + cumulative stats + share + countdown. */}
          <div className="mx-auto w-full max-w-md">
            {status === "won" ? (
              <p className="bg-linear-to-b from-match to-match/80 border-match-edge text-parchment win-pop font-display my-3 border p-3 text-center text-base tracking-[0.08em] uppercase md:text-lg">
                Solved in {guesses.length} {guesses.length === 1 ? "guess" : "guesses"}
              </p>
            ) : (
              <p className="bg-panneau border-line text-parchment font-display my-3 border p-3 text-center text-base tracking-[0.08em] uppercase md:text-lg">
                Game over — try again tomorrow
              </p>
            )}
            <StatsBlock stats={stats} />
            <Histogram
              distribution={stats.guess_distribution}
              highlight={status === "won" ? guesses.length : null}
            />
            {shareText !== null && <ShareButton text={shareText} />}
            <Countdown />
          </div>
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
        <HowToPlayBase<Boss, BossGuessFeedback>
          exampleGuess={EXAMPLE_GUESS}
          attributes={BOSSES_ATTRIBUTES}
          gridTemplate={BOSSES_GRID_TEMPLATE}
          dir="bosses"
          noun="Boss"
          maxGuesses={MAX_GUESSES}
          partialHint="shares some weaknesses/resistances"
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
