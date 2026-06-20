import { beforeEach, describe, expect, it } from "vitest";
import { loadState, loadStats, saveState, saveStats } from "./storage";
import { EMPTY_STATS } from "./stats";
import type { Stats, StoredGameState } from "./types";

beforeEach(() => localStorage.clear());

describe("game state storage", () => {
  it("round-trips state for a given date", () => {
    const state: StoredGameState = {
      guesses: [],
      status: "won",
      puzzle_number: 5,
      stats_recorded: true,
    };
    saveState("2026-06-17", state);
    expect(loadState("2026-06-17")).toEqual(state);
  });

  it("returns null for an absent date", () => {
    expect(loadState("2026-01-01")).toBeNull();
  });

  it("returns null on corrupt JSON", () => {
    localStorage.setItem("expedition33dle:classic:state:2026-06-17", "{not json");
    expect(loadState("2026-06-17")).toBeNull();
  });

  it("returns null on an unexpected shape", () => {
    localStorage.setItem(
      "expedition33dle:classic:state:2026-06-17",
      JSON.stringify({ status: "bogus", puzzle_number: "x" }),
    );
    expect(loadState("2026-06-17")).toBeNull();
  });

  it("defaults a missing stats_recorded flag to false", () => {
    localStorage.setItem(
      "expedition33dle:classic:state:2026-06-17",
      JSON.stringify({ guesses: [], status: "won", puzzle_number: 5 }),
    );
    expect(loadState("2026-06-17")?.stats_recorded).toBe(false);
  });
});

describe("stats storage", () => {
  it("round-trips stats", () => {
    const stats: Stats = { ...EMPTY_STATS, played: 3, won: 2, max_streak: 2 };
    saveStats(stats);
    expect(loadStats()).toEqual(stats);
  });

  it("falls back to EMPTY_STATS on corruption", () => {
    expect(loadStats()).toEqual(EMPTY_STATS); // nothing stored
    localStorage.setItem("expedition33dle:stats", "nope");
    expect(loadStats()).toEqual(EMPTY_STATS);
  });
});
