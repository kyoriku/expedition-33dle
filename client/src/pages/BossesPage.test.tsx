import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import BossesPage from "./BossesPage";
import type { Boss, BossGuessResponse, BossTodayResponse } from "../lib/types";

// Mock the network layer so the full component tree mounts without a server.
vi.mock("../lib/api", () => ({
  ApiError: class ApiError extends Error {},
  getBossesToday: vi.fn(),
  submitBossGuess: vi.fn(),
  revealBoss: vi.fn(),
}));
import { getBossesToday, submitBossGuess, revealBoss } from "../lib/api";

const bss = (id: number, name: string, over: Partial<Boss> = {}): Boss => ({
  id,
  name,
  weakness: ["Lightning"],
  resistance: ["Ice"],
  category: "Nevron",
  location: "Flying Waters",
  encounter: "Required",
  act_introduced: 1,
  image: null,
  ...over,
});

/** An all-miss/lower feedback guess response (every key present + valid). */
const missResponse = (b: Boss): BossGuessResponse => ({
  guess: b,
  is_correct: false,
  feedback: {
    weakness: "miss",
    resistance: "miss",
    category: "miss",
    location: "miss",
    encounter: "miss",
    act_introduced: "lower",
  },
});

/** An all-match winning guess response. */
const winResponse = (b: Boss): BossGuessResponse => ({
  guess: b,
  is_correct: true,
  feedback: {
    weakness: "match",
    resistance: "match",
    category: "match",
    location: "match",
    encounter: "match",
    act_introduced: "match",
  },
});

const TODAY: BossTodayResponse = {
  puzzle_date: "2026-06-17",
  puzzle_number: 4,
  bosses: [
    bss(1, "Goblu"),
    bss(2, "Dualliste", { category: "Human", location: "Forgotten Battlefield" }),
  ],
  yesterday: null,
};

const STATE_KEY = "expedition33dle:bosses:state:2026-06-17";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <BossesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(getBossesToday).mockResolvedValue(TODAY);
  vi.mocked(submitBossGuess).mockReset();
  vi.mocked(revealBoss).mockReset();
});

describe("BossesPage", () => {
  it("loads today's puzzle and shows the input (grid appears after the first guess)", async () => {
    renderPage();
    expect(await screen.findByRole("combobox")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("scores a guess and exposes scalar + directional feedback to assistive tech", async () => {
    vi.mocked(submitBossGuess).mockResolvedValue({
      guess: bss(2, "Dualliste", { category: "Human" }),
      is_correct: false,
      feedback: {
        weakness: "miss",
        resistance: "partial",
        category: "miss",
        location: "miss",
        encounter: "miss",
        act_introduced: "higher",
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByRole("combobox"), "dual");
    await user.click(screen.getByRole("option", { name: "Dualliste" }));

    expect(
      await screen.findByRole("rowheader", { name: /Your guess: Dualliste/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /guesses/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Weakness" })).toBeInTheDocument();
    // Scalar miss announces its state, not just a color.
    expect(
      screen.getByRole("cell", { name: /Category: Human, no match/ }),
    ).toBeInTheDocument();
    // Directional cell announces higher/lower.
    expect(
      screen.getByRole("cell", { name: /Act: 1, answer is higher/ }),
    ).toBeInTheDocument();
  });

  it("wins when the correct boss is guessed", async () => {
    vi.mocked(submitBossGuess).mockResolvedValue(winResponse(bss(1, "Goblu")));
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByRole("combobox"), "gobl");
    await user.click(screen.getByRole("option", { name: "Goblu" }));

    // Exact string targets the banner only (the sr-only announcement also
    // contains "Solved in 1 guess." as part of a longer sentence).
    expect(await screen.findByText("Solved in 1 guess")).toBeInTheDocument();
    expect(screen.getByText(/next puzzle in/i)).toBeInTheDocument();
    // Game over → input is gone.
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(
      screen.getByRole("rowheader", { name: /correct answer/ }),
    ).toBeInTheDocument();
  });

  it("loses after the guess cap and reveals the answer", async () => {
    // Seed MAX_GUESSES-1 (6) prior guesses so one more wrong guess loses.
    const prior = Array.from({ length: 6 }, (_, i) =>
      missResponse(bss(11 + i, `Filler ${i}`)),
    );
    localStorage.setItem(
      STATE_KEY,
      JSON.stringify({ guesses: prior, status: "in_progress", puzzle_number: 4 }),
    );
    vi.mocked(submitBossGuess).mockResolvedValue(missResponse(bss(2, "Dualliste")));
    vi.mocked(revealBoss).mockResolvedValue(bss(1, "Goblu"));
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByRole("combobox"), "dual");
    await user.click(screen.getByRole("option", { name: "Dualliste" }));

    expect(await screen.findByText(/Game over/)).toBeInTheDocument();
    expect(
      await screen.findByRole("rowheader", { name: /Answer: Goblu/ }),
    ).toBeInTheDocument();
    // Reveal is gated server-side on proof of loss; the client sends its guess ids.
    expect(vi.mocked(revealBoss)).toHaveBeenCalledWith(
      expect.arrayContaining([2]),
    );
    // Share button is available on the loss screen too.
    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
  });

  it("restores in-progress state from localStorage on reload", async () => {
    vi.mocked(submitBossGuess).mockResolvedValue(missResponse(bss(2, "Dualliste")));
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByRole("combobox"), "dual");
    await user.click(screen.getByRole("option", { name: "Dualliste" }));
    expect(
      await screen.findByRole("rowheader", { name: /Your guess: Dualliste/ }),
    ).toBeInTheDocument();

    // Remount (simulates a reload) — localStorage persists across cleanup.
    cleanup();
    renderPage();

    expect(
      await screen.findByRole("rowheader", { name: /Your guess: Dualliste/ }),
    ).toBeInTheDocument();
    // The restored guess wasn't re-submitted.
    expect(vi.mocked(submitBossGuess)).toHaveBeenCalledTimes(1);
  });
});

const BOSSES_STATS_KEY = "expedition33dle:bosses:stats";

describe("BossesPage stats", () => {
  it("opens the stats modal from the header (empty state)", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Statistics" }));
    expect(
      screen.getByRole("dialog", { name: /statistics/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/next puzzle in/i)).toBeInTheDocument();
    // No game played yet.
    expect(localStorage.getItem(BOSSES_STATS_KEY)).toBeNull();
  });

  it("records a win and shows the inline stats section", async () => {
    vi.mocked(submitBossGuess).mockResolvedValue(winResponse(bss(1, "Goblu")));
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByRole("combobox"), "gobl");
    await user.click(screen.getByRole("option", { name: "Goblu" }));
    await screen.findByText("Solved in 1 guess");

    // Inline stats render on the win screen.
    expect(screen.getByText("Played")).toBeInTheDocument();
    expect(screen.getByText(/guess distribution/i)).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem(BOSSES_STATS_KEY)!);
    expect(stored.played).toBe(1);
    expect(stored.won).toBe(1);
    expect(stored.current_streak).toBe(1);
    expect(stored.guess_distribution).toHaveLength(7);
    expect(stored.guess_distribution[0]).toBe(1); // won in 1 guess -> bucket 0
  });

  it("records the finished game exactly once across reloads", async () => {
    vi.mocked(submitBossGuess).mockResolvedValue(winResponse(bss(1, "Goblu")));
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByRole("combobox"), "gobl");
    await user.click(screen.getByRole("option", { name: "Goblu" }));
    await screen.findByText("Solved in 1 guess");
    expect(JSON.parse(localStorage.getItem(BOSSES_STATS_KEY)!).played).toBe(1);

    // Reload the finished game — recording must not run again.
    cleanup();
    renderPage();
    await screen.findByText("Solved in 1 guess");
    expect(JSON.parse(localStorage.getItem(BOSSES_STATS_KEY)!).played).toBe(1);
  });

  it("keeps bosses stats independent from classic stats", async () => {
    vi.mocked(submitBossGuess).mockResolvedValue(winResponse(bss(1, "Goblu")));
    const user = userEvent.setup();
    renderPage();
    await user.type(await screen.findByRole("combobox"), "gobl");
    await user.click(screen.getByRole("option", { name: "Goblu" }));
    await screen.findByText("Solved in 1 guess");

    expect(localStorage.getItem(BOSSES_STATS_KEY)).not.toBeNull();
    expect(localStorage.getItem("expedition33dle:classic:stats")).toBeNull();
  });
});

describe("BossesPage share", () => {
  it("shows a share button on win that copies the bosses share text", async () => {
    vi.mocked(submitBossGuess).mockResolvedValue(winResponse(bss(1, "Goblu")));
    const user = userEvent.setup();
    renderPage();
    await user.type(await screen.findByRole("combobox"), "gobl");
    await user.click(screen.getByRole("option", { name: "Goblu" }));
    await screen.findByText("Solved in 1 guess");

    // jsdom has no navigator.share, so ShareButton falls back to the clipboard.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    await user.click(screen.getByRole("button", { name: /share/i }));
    expect(await screen.findByText(/copied to clipboard/i)).toBeInTheDocument();

    expect(writeText).toHaveBeenCalledTimes(1);
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain("Expedition 33dle Bosses #");
    expect(text).toContain("1/7");
    expect(text).toContain("https://expedition33dle.com/bosses");
  });
});
