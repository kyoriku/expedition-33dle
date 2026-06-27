import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MenuPage from "./MenuPage";
import { saveState, saveStats } from "../lib/storage";
import { EMPTY_STATS } from "../lib/stats";
import { todayUtcISO } from "../lib/time";
import type { ClassicGuessResponse } from "../lib/types";

const today = todayUtcISO();

// loadState only checks Array.isArray(guesses), so placeholder entries suffice.
const guesses = (n: number) =>
  Array.from({ length: n }, () => ({})) as unknown as ClassicGuessResponse[];

function renderMenu() {
  return render(
    <MemoryRouter>
      <MenuPage />
    </MemoryRouter>,
  );
}

const card = (mode: RegExp) => screen.getByRole("link", { name: mode });

describe("MenuPage", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("renders a card for each mode linking to its route", () => {
    renderMenu();
    expect(card(/classic/i)).toHaveAttribute("href", "/classic");
    expect(card(/pictos/i)).toHaveAttribute("href", "/pictos");
    expect(card(/weapons/i)).toHaveAttribute("href", "/weapons");
    expect(card(/bosses/i)).toHaveAttribute("href", "/bosses");
  });

  it("shows each mode's heading", () => {
    renderMenu();
    expect(
      screen.getByRole("heading", { name: "Classic" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pictos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Weapons" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bosses" })).toBeInTheDocument();
  });

  it("renders a decorative icon in each card", () => {
    renderMenu();
    expect(card(/classic/i).querySelector("svg")).toBeInTheDocument();
    expect(card(/pictos/i).querySelector("svg")).toBeInTheDocument();
    expect(card(/weapons/i).querySelector("svg")).toBeInTheDocument();
    expect(card(/bosses/i).querySelector("svg")).toBeInTheDocument();
  });

  it("shows 'Not yet played' on every card with empty storage", () => {
    renderMenu();
    expect(screen.getAllByText("Not yet played")).toHaveLength(4);
  });

  it("reflects an in-progress classic game, leaving the other modes untouched", () => {
    saveState(today, {
      guesses: guesses(2),
      status: "in_progress",
      puzzle_number: 1,
      stats_recorded: false,
    });
    renderMenu();
    expect(
      within(card(/classic/i)).getByText("In progress · 2/6 guesses used"),
    ).toBeInTheDocument();
    expect(within(card(/pictos/i)).getByText("Not yet played")).toBeInTheDocument();
    expect(within(card(/weapons/i)).getByText("Not yet played")).toBeInTheDocument();
    expect(within(card(/bosses/i)).getByText("Not yet played")).toBeInTheDocument();
  });

  it("shows a win with guess count and streak on the classic card", () => {
    saveStats({ ...EMPTY_STATS, played: 3, won: 3, current_streak: 3, max_streak: 3 });
    saveState(today, {
      guesses: guesses(4),
      status: "won",
      puzzle_number: 1,
      stats_recorded: true,
    });
    renderMenu();
    expect(
      within(card(/classic/i)).getByText("Won in 4/6 ✓ · Streak: 3"),
    ).toBeInTheDocument();
  });
});
