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
    expect(vi.mocked(revealPicto)).toHaveBeenCalled();
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
