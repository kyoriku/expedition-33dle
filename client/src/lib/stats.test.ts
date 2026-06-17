import { describe, expect, it } from "vitest";
import { EMPTY_STATS, isPreviousDay, recordGame } from "./stats";

describe("isPreviousDay", () => {
  it("is true only for exactly one calendar day before (UTC)", () => {
    expect(isPreviousDay("2026-06-17", "2026-06-16")).toBe(true);
    expect(isPreviousDay("2026-07-01", "2026-06-30")).toBe(true); // month boundary
    expect(isPreviousDay("2026-06-17", "2026-06-15")).toBe(false); // gap
    expect(isPreviousDay("2026-06-17", "2026-06-17")).toBe(false); // same day
  });
});

describe("recordGame", () => {
  const won = (
    prev = EMPTY_STATS,
    date: string,
    num: number,
    guesses: number,
  ) =>
    recordGame(prev, {
      puzzle_number: num,
      puzzle_date: date,
      status: "won",
      guess_count: guesses,
    });

  it("starts a streak at 1 and records the guess distribution on first win", () => {
    const s = won(EMPTY_STATS, "2026-06-14", 1, 3);
    expect(s.played).toBe(1);
    expect(s.won).toBe(1);
    expect(s.current_streak).toBe(1);
    expect(s.max_streak).toBe(1);
    expect(s.guess_distribution[2]).toBe(1); // guess_count 3 -> index 2
    expect(s.last_played_date).toBe("2026-06-14");
  });

  it("extends the streak on consecutive-day wins", () => {
    const d1 = won(EMPTY_STATS, "2026-06-14", 1, 2);
    const d2 = won(d1, "2026-06-15", 2, 4);
    expect(d2.current_streak).toBe(2);
    expect(d2.max_streak).toBe(2);
  });

  it("restarts the streak after a missed day but preserves max", () => {
    const d1 = won(EMPTY_STATS, "2026-06-14", 1, 2);
    const d2 = won(d1, "2026-06-15", 2, 2); // streak 2, max 2
    const skip = won(d2, "2026-06-17", 4, 3); // gap (16th missed)
    expect(skip.current_streak).toBe(1);
    expect(skip.max_streak).toBe(2);
  });

  it("resets current streak to 0 on a loss but keeps max and counts the game", () => {
    const d1 = won(EMPTY_STATS, "2026-06-14", 1, 2);
    const d2 = won(d1, "2026-06-15", 2, 2); // streak 2, max 2
    const lost = recordGame(d2, {
      puzzle_number: 3,
      puzzle_date: "2026-06-16",
      status: "lost",
      guess_count: 6,
    });
    expect(lost.current_streak).toBe(0);
    expect(lost.max_streak).toBe(2);
    expect(lost.played).toBe(3);
    expect(lost.won).toBe(2);
  });

  it("does not mutate the input stats", () => {
    const before = structuredClone(EMPTY_STATS);
    won(EMPTY_STATS, "2026-06-14", 1, 1);
    expect(EMPTY_STATS).toEqual(before);
  });
});
