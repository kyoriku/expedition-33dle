import { beforeEach, describe, expect, it } from "vitest";
import {
  loadPictosStats,
  loadState,
  loadStats,
  pruneOldDailyState,
  savePictosStats,
  saveState,
  saveStats,
} from "./storage";
import { EMPTY_PICTO_STATS, EMPTY_STATS } from "./stats";
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
    localStorage.setItem("expedition33dle:classic:stats", "nope");
    expect(loadStats()).toEqual(EMPTY_STATS);
  });
});

describe("pictos stats storage", () => {
  it("round-trips pictos stats (8-bucket distribution)", () => {
    const stats: Stats = { ...EMPTY_PICTO_STATS, played: 2, won: 1, max_streak: 1 };
    savePictosStats(stats);
    expect(loadPictosStats()).toEqual(stats);
    expect(loadPictosStats().guess_distribution).toHaveLength(8);
  });

  it("falls back to EMPTY_PICTO_STATS on corruption or wrong-length distribution", () => {
    expect(loadPictosStats()).toEqual(EMPTY_PICTO_STATS); // nothing stored
    localStorage.setItem("expedition33dle:pictos:stats", "nope");
    expect(loadPictosStats()).toEqual(EMPTY_PICTO_STATS);
    // A classic-sized (6) distribution is rejected for pictos.
    localStorage.setItem(
      "expedition33dle:pictos:stats",
      JSON.stringify({ ...EMPTY_PICTO_STATS, guess_distribution: [0, 0, 0, 0, 0, 0] }),
    );
    expect(loadPictosStats()).toEqual(EMPTY_PICTO_STATS);
  });

  it("uses a separate key from classic stats", () => {
    savePictosStats({ ...EMPTY_PICTO_STATS, played: 5 });
    expect(loadStats()).toEqual(EMPTY_STATS); // classic untouched
  });
});

describe("pruneOldDailyState", () => {
  it("deletes only non-today :state keys; keeps today + :stats + :tutorial_seen", () => {
    const today = "2026-06-20";
    const keep = [
      "expedition33dle:classic:state:2026-06-20",
      "expedition33dle:pictos:state:2026-06-20",
      "expedition33dle:classic:stats",
      "expedition33dle:pictos:stats",
      "expedition33dle:classic:tutorial_seen",
      "expedition33dle:pictos:tutorial_seen",
    ];
    const drop = [
      "expedition33dle:classic:state:2026-06-19",
      "expedition33dle:pictos:state:2026-06-18",
    ];
    [...keep, ...drop].forEach((k) => localStorage.setItem(k, "x"));

    pruneOldDailyState(today);

    keep.forEach((k) => expect(localStorage.getItem(k)).not.toBeNull());
    drop.forEach((k) => expect(localStorage.getItem(k)).toBeNull());
  });
});
