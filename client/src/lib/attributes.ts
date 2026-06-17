// Single source of truth for the Classic-mode comparison columns. Previously
// the 8 attributes were duplicated across GuessGrid (headers), GuessRow (cells),
// and share.ts (emoji order); they now derive from ATTRIBUTES so adding,
// reordering, or relabelling a column happens in exactly one place. This is also
// the seam a future mode (Weapons, Pictos) would swap out.

import type { Entity, GuessFeedback } from "./types";

/** Comparison outcome a single attribute cell can show. "neutral" is the name
 *  cell / answer-reveal cell, which carries no comparison. */
export type CellState =
  | "match"
  | "partial"
  | "miss"
  | "higher"
  | "lower"
  | "unknown"
  | "neutral";

export type AttributeKind = "scalar" | "age" | "element" | "direction";

export interface AttributeDescriptor {
  /** Shared key into both Entity (the value) and GuessFeedback (the state). */
  key: keyof GuessFeedback & keyof Entity;
  /** Column header and legend label. */
  label: string;
  kind: AttributeKind;
  /** Display string for an entity's value in this column. */
  format: (entity: Entity) => string;
}

export const ATTRIBUTES = [
  { key: "gender", label: "Gender", kind: "scalar", format: (e: Entity) => e.gender },
  {
    key: "age",
    label: "Age",
    kind: "age",
    format: (e: Entity) => (e.age === null ? "—" : String(e.age)),
  },
  { key: "class_role", label: "Class", kind: "scalar", format: (e: Entity) => e.class_role },
  { key: "weapon", label: "Weapon", kind: "scalar", format: (e: Entity) => e.weapon },
  {
    key: "element",
    label: "Element",
    kind: "element",
    format: (e: Entity) => (e.element.length ? e.element.join(", ") : "—"),
  },
  {
    key: "act_introduced",
    label: "Act",
    kind: "direction",
    format: (e: Entity) => String(e.act_introduced),
  },
  { key: "species", label: "Species", kind: "scalar", format: (e: Entity) => e.species },
  { key: "affiliation", label: "Affiliation", kind: "scalar", format: (e: Entity) => e.affiliation },
] as const satisfies readonly AttributeDescriptor[];

/** Column order for the share grid (feedback keys only). */
export const FIELD_ORDER = ATTRIBUTES.map((a) => a.key);

/** Always-visible glyph per state. Distinguishing match/partial/miss by glyph —
 *  not just by green/gold/red — keeps the grid legible without color (WCAG 1.4.1,
 *  colour-blind users). higher/lower/unknown already carried glyphs. */
export const STATE_GLYPH: Partial<Record<CellState, string>> = {
  match: "✓",
  partial: "≈",
  miss: "✗",
  higher: "↑",
  lower: "↓",
  unknown: "?",
};

/** Screen-reader phrase for a comparison outcome. */
export function describeState(state: CellState): string {
  switch (state) {
    case "match":
      return "match";
    case "partial":
      return "partial match";
    case "miss":
      return "no match";
    case "higher":
      return "answer is higher";
    case "lower":
      return "answer is lower";
    case "unknown":
      return "unknown";
    case "neutral":
      return "";
  }
}

/** Full screen-reader label for one cell, e.g. "Class: Engineer, no match". */
export function cellAriaLabel(label: string, value: string, state: CellState): string {
  const desc = describeState(state);
  return desc ? `${label}: ${value}, ${desc}` : `${label}: ${value}`;
}
