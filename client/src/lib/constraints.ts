import type { DirectionFeedback } from "./types";

// Shared numeric-bound helpers for the per-page constraint-propagation
// autocomplete prototypes. A directional (▲▼) column accumulates an exact value
// once a green lands, otherwise the tightest exclusive window implied by every
// "higher" (answer is above the guessed value) / "lower" (answer is below) seen
// so far. The answer always satisfies its own feedback, so filtering candidates
// through these bounds can never hide it.

export interface Bounds {
  eq?: number;
  gt?: number;
  lt?: number;
}

/** Fold one guess's directional feedback for a column into the running bounds. */
export function tightenBounds(
  b: Bounds | undefined,
  guessed: number,
  feedback: DirectionFeedback,
): Bounds {
  if (feedback === "match") return { ...b, eq: guessed };
  if (feedback === "higher")
    return { ...b, gt: Math.max(b?.gt ?? -Infinity, guessed) };
  return { ...b, lt: Math.min(b?.lt ?? Infinity, guessed) };
}

/** Does a candidate's value satisfy the accumulated bounds? (None = anything.) */
export function inBounds(value: number, b: Bounds | undefined): boolean {
  if (!b) return true;
  if (b.eq !== undefined && value !== b.eq) return false;
  if (b.gt !== undefined && value <= b.gt) return false;
  if (b.lt !== undefined && value >= b.lt) return false;
  return true;
}
