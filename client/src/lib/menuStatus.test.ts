import { describe, expect, it } from "vitest";
import { formatMenuStatus } from "./menuStatus";
import { EMPTY_STATS } from "./stats";
import type { ClassicGuessResponse, GameStatus, Stats, StoredGameState } from "./types";

const stats = (over: Partial<Stats> = {}): Stats => ({ ...EMPTY_STATS, ...over });

// formatMenuStatus only reads guesses.length, so placeholder entries suffice.
const guesses = (n: number) =>
  Array.from({ length: n }, () => ({})) as unknown as ClassicGuessResponse[];

const state = (status: GameStatus, n: number): StoredGameState => ({
  guesses: guesses(n),
  status,
  puzzle_number: 1,
  stats_recorded: status !== "in_progress",
});

describe("formatMenuStatus", () => {
  it("shows 'Not yet played' alone when nothing is stored and no streak", () => {
    expect(formatMenuStatus(null, stats(), 6).text).toBe("Not yet played");
  });

  it("appends a live streak to the not-yet-played line", () => {
    expect(formatMenuStatus(null, stats({ current_streak: 3 }), 6).text).toBe(
      "Not yet played · Streak: 3",
    );
  });

  it("reports progress out of the mode's max guesses", () => {
    expect(formatMenuStatus(state("in_progress", 2), stats(), 6).text).toBe(
      "In progress · 2/6 guesses used",
    );
  });

  it("reports a win with guess count and current streak", () => {
    expect(
      formatMenuStatus(state("won", 4), stats({ current_streak: 5 }), 6).text,
    ).toBe("Won in 4/6 ✓ · Streak: 5");
  });

  it("reports a loss plainly, with no streak text", () => {
    expect(formatMenuStatus(state("lost", 6), stats(), 6).text).toBe("Lost today");
  });

  it("honors the pictos max-guess count", () => {
    expect(
      formatMenuStatus(state("won", 7), stats({ current_streak: 1 }), 8).text,
    ).toBe("Won in 7/8 ✓ · Streak: 1");
  });
});
