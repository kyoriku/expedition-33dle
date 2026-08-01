import { describe, expect, it } from "vitest";
import { inBounds, tightenBounds, type Bounds } from "./constraints";

describe("tightenBounds", () => {
  it("starts a lower bound from 'higher' feedback", () => {
    expect(tightenBounds(undefined, 3, "higher")).toEqual({ gt: 3 });
  });

  it("starts an upper bound from 'lower' feedback", () => {
    expect(tightenBounds(undefined, 20, "lower")).toEqual({ lt: 20 });
  });

  it("keeps only the tightest bound on each side", () => {
    let b: Bounds | undefined;
    b = tightenBounds(b, 2, "higher");
    b = tightenBounds(b, 5, "higher"); // tighter
    b = tightenBounds(b, 30, "lower");
    b = tightenBounds(b, 40, "lower"); // looser — ignored
    expect(b).toEqual({ gt: 5, lt: 30 });
  });

  it("pins the exact value on a green", () => {
    const b = tightenBounds({ gt: 2 }, 4, "match");
    expect(b.eq).toBe(4);
  });
});

describe("inBounds", () => {
  it("accepts anything when no bounds accumulated", () => {
    expect(inBounds(7, undefined)).toBe(true);
  });

  it("treats directional bounds as exclusive", () => {
    const b: Bounds = { gt: 3, lt: 10 };
    expect(inBounds(3, b)).toBe(false); // "higher than 3" excludes 3
    expect(inBounds(4, b)).toBe(true);
    expect(inBounds(9, b)).toBe(true);
    expect(inBounds(10, b)).toBe(false); // "lower than 10" excludes 10
  });

  it("requires the exact value once a green pinned it", () => {
    expect(inBounds(4, { eq: 4 })).toBe(true);
    expect(inBounds(5, { eq: 4 })).toBe(false);
  });
});
