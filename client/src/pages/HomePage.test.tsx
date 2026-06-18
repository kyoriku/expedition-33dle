import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import HomePage from "./HomePage";
import type {
  Entity,
  GuessResponse,
  TodayResponse,
} from "../lib/types";

// Mock the network layer so the full component tree mounts without a server.
vi.mock("../lib/api", () => ({
  ApiError: class ApiError extends Error {},
  fetchToday: vi.fn(),
  submitGuess: vi.fn(),
  revealAnswer: vi.fn(),
}));
import { fetchToday, submitGuess } from "../lib/api";

const ent = (id: number, name: string, over: Partial<Entity> = {}): Entity => ({
  id,
  name,
  gender: "male",
  role: "Engineer",
  weapon: "Sword",
  element: ["Fire"],
  act_introduced: 1,
  category: "Human",
  affiliation: "Expedition 33",
  zone: "Lumière",
  image: null,
  ...over,
});

const TODAY: TodayResponse = {
  puzzle_date: "2026-06-17",
  puzzle_number: 4,
  entities: [ent(1, "Gustave"), ent(2, "Maelle", { gender: "female" })],
  yesterday: null,
};

function renderHome() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("expedition33dle:tutorial_seen", "true"); // skip auto-modal
  vi.mocked(fetchToday).mockResolvedValue(TODAY);
});

describe("HomePage", () => {
  it("loads today's puzzle and shows the input (grid appears after the first guess)", async () => {
    renderHome();
    expect(await screen.findByRole("combobox")).toBeInTheDocument();
    // The grid/headers stay hidden until there's a guess to show.
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("scores a guess and exposes per-cell feedback to assistive tech", async () => {
    const result: GuessResponse = {
      guess: ent(2, "Maelle", { gender: "female" }),
      is_correct: false,
      feedback: {
        gender: "miss",
        role: "match",
        weapon: "match",
        element: "match",
        act_introduced: "match",
        category: "match",
        affiliation: "match",
        zone: "match",
      },
    };
    vi.mocked(submitGuess).mockResolvedValue(result);
    const user = userEvent.setup();
    renderHome();

    await user.type(await screen.findByRole("combobox"), "mael");
    await user.click(screen.getByRole("option", { name: "Maelle" }));

    expect(
      await screen.findByRole("rowheader", { name: /Your guess: Maelle/ }),
    ).toBeInTheDocument();
    // The grid (with table semantics + headers) appears once there's a guess.
    expect(screen.getByRole("table", { name: /guesses/i })).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Gender" }),
    ).toBeInTheDocument();
    // The mismatched gender cell announces its state, not just a color.
    expect(
      screen.getByRole("cell", { name: /Gender: female, no match/ }),
    ).toBeInTheDocument();
  });

  it("opens the stats modal from the header at any time", async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(await screen.findByRole("button", { name: "Statistics" }));
    expect(
      screen.getByRole("dialog", { name: /statistics/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/next puzzle in/i)).toBeInTheDocument();
  });
});
