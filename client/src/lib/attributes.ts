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

export type AttributeKind = "scalar" | "element" | "direction";

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
  { key: "role", label: "Role", kind: "scalar", format: (e: Entity) => e.role },
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
  { key: "category", label: "Category", kind: "scalar", format: (e: Entity) => e.category },
  { key: "affiliation", label: "Affiliation", kind: "scalar", format: (e: Entity) => e.affiliation },
  { key: "zone", label: "Zone", kind: "scalar", format: (e: Entity) => e.zone },
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

/** Large faint glyph drawn behind the value for the directional (Act) cell. */
export const DIRECTION_BIG: Partial<Record<CellState, string>> = {
  higher: "▲",
  lower: "▼",
};

export interface StateVisual {
  /** Square gradient fill + state-edge border + text color for a guess cell. */
  cell: string;
  /** Compact swatch (fill + border + text) for the legend and how-to chips. */
  swatch: string;
}

/** Single source of truth for the ornate per-state cell styling. Class strings
 *  are literal (not interpolated) so Tailwind's JIT scanner picks them up. */
export const STATE_VISUAL: Record<CellState, StateVisual> = {
  match: {
    cell: "bg-linear-to-b from-match to-match/80 border border-match-edge text-parchment",
    swatch: "bg-match border border-match-edge text-parchment",
  },
  partial: {
    cell: "bg-linear-to-b from-partial to-partial/80 border border-partial-edge text-glyph",
    swatch: "bg-partial border border-partial-edge text-glyph",
  },
  unknown: {
    cell: "bg-linear-to-b from-partial to-partial/80 border border-partial-edge text-glyph",
    swatch: "bg-partial border border-partial-edge text-glyph",
  },
  miss: {
    cell: "bg-linear-to-b from-miss to-miss/80 border border-miss-edge text-parchment",
    swatch: "bg-miss border border-miss-edge text-parchment",
  },
  higher: {
    cell: "bg-linear-to-b from-miss to-miss/80 border border-miss-edge text-parchment",
    swatch: "bg-miss border border-miss-edge text-parchment",
  },
  lower: {
    cell: "bg-linear-to-b from-miss to-miss/80 border border-miss-edge text-parchment",
    swatch: "bg-miss border border-miss-edge text-parchment",
  },
  neutral: {
    cell: "bg-panneau border border-line text-parchment",
    swatch: "bg-panneau border border-line text-parchment",
  },
};
