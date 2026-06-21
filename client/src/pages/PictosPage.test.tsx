import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import PictosPage from "./PictosPage";
import type { Picto, PictoGuessResponse, PictoTodayResponse } from "../lib/types";

// Mock the network layer so the full component tree mounts without a server.
vi.mock("../lib/api", () => ({
  ApiError: class ApiError extends Error {},
  getPictosToday: vi.fn(),
  submitPictoGuess: vi.fn(),
  revealPicto: vi.fn(),
}));
import { getPictosToday, submitPictoGuess, revealPicto } from "../lib/api";

const pic = (id: number, name: string, over: Partial<Picto> = {}): Picto => ({
  id,
  name,
  type: "Offensive",
  stats: ["Crit"],
  lumina_cost: 5,
  effect_category: "Damage",
  source: "Pickup",
  zone_obtained: "Lumière",
  act_introduced: 1,
  image: null,
  ...over,
});

/** An all-miss/lower feedback guess response (every key present + valid). */
const missResponse = (p: Picto): PictoGuessResponse => ({
  guess: p,
  is_correct: false,
  feedback: {
    type: "miss",
    stats: "miss",
    lumina_cost: "lower",
    effect_category: "miss",
    source: "miss",
    zone_obtained: "miss",
    act_introduced: "lower",
  },
});

/** An all-match winning guess response. */
const winResponse = (p: Picto): PictoGuessResponse => ({
  guess: p,
  is_correct: true,
  feedback: {
    type: "match",
    stats: "match",
    lumina_cost: "match",
    effect_category: "match",
    source: "match",
    zone_obtained: "match",
    act_introduced: "match",
  },
});

const TODAY: PictoTodayResponse = {
  puzzle_date: "2026-06-17",
  puzzle_number: 4,
  pictos: [
    pic(1, "Energising Start"),
    pic(2, "Glass Cannon", { type: "Support", lumina_cost: 30 }),
  ],
  yesterday: null,
};

const STATE_KEY = "expedition33dle:pictos:state:2026-06-17";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PictosPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("expedition33dle:pictos:tutorial_seen", "true"); // skip auto-modal
  vi.mocked(getPictosToday).mockResolvedValue(TODAY);
  vi.mocked(submitPictoGuess).mockReset();
  vi.mocked(revealPicto).mockReset();
});

describe("PictosPage", () => {
  it("loads today's puzzle and shows the input (grid appears after the first guess)", async () => {
    renderPage();
    expect(await screen.findByRole("combobox")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("scores a guess and exposes scalar + directional feedback to assistive tech", async () => {
    vi.mocked(submitPictoGuess).mockResolvedValue({
      guess: pic(2, "Glass Cannon", { type: "Support", lumina_cost: 30 }),
      is_correct: false,
      feedback: {
        type: "miss",
        stats: "partial",
        lumina_cost: "higher",
        effect_category: "match",
        source: "miss",
        zone_obtained: "miss",
        act_introduced: "match",
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByRole("combobox"), "glass");
    await user.click(screen.getByRole("option", { name: "Glass Cannon" }));

    expect(
      await screen.findByRole("rowheader", { name: /Your guess: Glass Cannon/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /guesses/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Type" })).toBeInTheDocument();
    // Scalar miss announces its state, not just a color.
    expect(
      screen.getByRole("cell", { name: /Type: Support, no match/ }),
    ).toBeInTheDocument();
    // Directional cell announces higher/lower.
    expect(
      screen.getByRole("cell", { name: /Lumina: 30, answer is higher/ }),
    ).toBeInTheDocument();
  });

  it("wins when the correct picto is guessed", async () => {
    vi.mocked(submitPictoGuess).mockResolvedValue({
      guess: pic(1, "Energising Start"),
      is_correct: true,
      feedback: {
        type: "match",
        stats: "match",
        lumina_cost: "match",
        effect_category: "match",
        source: "match",
        zone_obtained: "match",
        act_introduced: "match",
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByRole("combobox"), "energ");
    await user.click(screen.getByRole("option", { name: "Energising Start" }));

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
    // Seed MAX_GUESSES-1 (7) prior guesses so one more wrong guess loses.
    const prior = Array.from({ length: 7 }, (_, i) =>
      missResponse(pic(11 + i, `Filler ${i}`)),
    );
    localStorage.setItem(
      STATE_KEY,
      JSON.stringify({ guesses: prior, status: "in_progress", puzzle_number: 4 }),
    );
    vi.mocked(submitPictoGuess).mockResolvedValue(
      missResponse(pic(2, "Glass Cannon")),
    );
    vi.mocked(revealPicto).mockResolvedValue(pic(1, "Energising Start"));
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByRole("combobox"), "glass");
    await user.click(screen.getByRole("option", { name: "Glass Cannon" }));

    expect(await screen.findByText(/Game over/)).toBeInTheDocument();
    expect(
      await screen.findByRole("rowheader", { name: /Answer: Energising Start/ }),
    ).toBeInTheDocument();
    // Reveal is gated server-side on proof of loss; the client sends its guess ids.
    expect(vi.mocked(revealPicto)).toHaveBeenCalledWith(
      expect.arrayContaining([2]),
    );
    // Share button is available on the loss screen too.
    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
  });

  it("restores in-progress state from localStorage on reload", async () => {
    vi.mocked(submitPictoGuess).mockResolvedValue(
      missResponse(pic(2, "Glass Cannon")),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByRole("combobox"), "glass");
    await user.click(screen.getByRole("option", { name: "Glass Cannon" }));
    expect(
      await screen.findByRole("rowheader", { name: /Your guess: Glass Cannon/ }),
    ).toBeInTheDocument();

    // Remount (simulates a reload) — localStorage persists across cleanup.
    cleanup();
    renderPage();

    expect(
      await screen.findByRole("rowheader", { name: /Your guess: Glass Cannon/ }),
    ).toBeInTheDocument();
    // The restored guess wasn't re-submitted.
    expect(vi.mocked(submitPictoGuess)).toHaveBeenCalledTimes(1);
  });
});

const PICTOS_STATS_KEY = "expedition33dle:pictos:stats";

describe("PictosPage stats", () => {
  it("opens the stats modal from the header (empty state)", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Statistics" }));
    expect(
      screen.getByRole("dialog", { name: /statistics/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/next puzzle in/i)).toBeInTheDocument();
    // No game played yet.
    expect(localStorage.getItem(PICTOS_STATS_KEY)).toBeNull();
  });

  it("records a win and shows the inline stats section", async () => {
    vi.mocked(submitPictoGuess).mockResolvedValue(
      winResponse(pic(1, "Energising Start")),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByRole("combobox"), "energ");
    await user.click(screen.getByRole("option", { name: "Energising Start" }));
    await screen.findByText("Solved in 1 guess");

    // Inline stats render on the win screen.
    expect(screen.getByText("Played")).toBeInTheDocument();
    expect(screen.getByText(/guess distribution/i)).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem(PICTOS_STATS_KEY)!);
    expect(stored.played).toBe(1);
    expect(stored.won).toBe(1);
    expect(stored.current_streak).toBe(1);
    expect(stored.guess_distribution).toHaveLength(8);
    expect(stored.guess_distribution[0]).toBe(1); // won in 1 guess -> bucket 0
  });

  it("records the finished game exactly once across reloads", async () => {
    vi.mocked(submitPictoGuess).mockResolvedValue(
      winResponse(pic(1, "Energising Start")),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByRole("combobox"), "energ");
    await user.click(screen.getByRole("option", { name: "Energising Start" }));
    await screen.findByText("Solved in 1 guess");
    expect(JSON.parse(localStorage.getItem(PICTOS_STATS_KEY)!).played).toBe(1);

    // Reload the finished game — recording must not run again.
    cleanup();
    renderPage();
    await screen.findByText("Solved in 1 guess");
    expect(JSON.parse(localStorage.getItem(PICTOS_STATS_KEY)!).played).toBe(1);
  });

  it("keeps pictos stats independent from classic stats", async () => {
    vi.mocked(submitPictoGuess).mockResolvedValue(
      winResponse(pic(1, "Energising Start")),
    );
    const user = userEvent.setup();
    renderPage();
    await user.type(await screen.findByRole("combobox"), "energ");
    await user.click(screen.getByRole("option", { name: "Energising Start" }));
    await screen.findByText("Solved in 1 guess");

    expect(localStorage.getItem(PICTOS_STATS_KEY)).not.toBeNull();
    expect(localStorage.getItem("expedition33dle:classic:stats")).toBeNull();
  });
});

describe("PictosPage share", () => {
  it("shows a share button on win that copies the pictos share text", async () => {
    vi.mocked(submitPictoGuess).mockResolvedValue(
      winResponse(pic(1, "Energising Start")),
    );
    const user = userEvent.setup();
    renderPage();
    await user.type(await screen.findByRole("combobox"), "energ");
    await user.click(screen.getByRole("option", { name: "Energising Start" }));
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
    expect(text).toContain("Expedition 33dle Pictos #");
    expect(text).toContain("1/8");
    expect(text).toContain("https://expedition33dle.com/pictos");
  });
});
