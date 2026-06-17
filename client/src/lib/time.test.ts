import { describe, expect, it } from "vitest";
import { formatHMS, msToNextUtcMidnight, todayUtcISO } from "./time";

describe("msToNextUtcMidnight", () => {
  it("counts the remaining ms to the next UTC midnight", () => {
    expect(msToNextUtcMidnight(new Date("2026-06-17T23:59:59.000Z"))).toBe(1000);
  });

  it("returns a full day at exactly midnight UTC", () => {
    expect(msToNextUtcMidnight(new Date("2026-06-17T00:00:00.000Z"))).toBe(
      86_400_000,
    );
  });
});

describe("todayUtcISO", () => {
  it("returns the UTC calendar date regardless of time of day", () => {
    expect(todayUtcISO(new Date("2026-06-17T23:30:00Z"))).toBe("2026-06-17");
    expect(todayUtcISO(new Date("2026-06-17T00:00:00Z"))).toBe("2026-06-17");
  });
});

describe("formatHMS", () => {
  it("pads to HH:MM:SS and clamps negatives to zero", () => {
    expect(formatHMS(0)).toBe("00:00:00");
    expect(formatHMS(-5000)).toBe("00:00:00");
    expect(formatHMS(3_661_000)).toBe("01:01:01");
    expect(formatHMS(86_399_000)).toBe("23:59:59");
  });
});
