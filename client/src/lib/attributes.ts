// Single source of truth for the Classic-mode comparison columns. Previously
// the 8 attributes were duplicated across GuessGrid (headers), GuessRow (cells),
// and share.ts (emoji order); they now derive from ATTRIBUTES so adding,
// reordering, or relabelling a column happens in exactly one place. This is also
// the seam a future mode (Weapons, Pictos) would swap out.

import type {
  Boss,
  BossGuessFeedback,
  ClassicGuessFeedback,
  Character,
  Picto,
  PictoGuessFeedback,
  Weapon,
  WeaponGuessFeedback,
} from "./types";

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

export type AttributeKind = "scalar" | "array" | "element" | "direction";

export interface AttributeDescriptor<T, F> {
  /** Key valid on both the item type (the value) and the mode's feedback type
   *  (the per-cell state) — so a column can't reference a field the feedback
   *  payload doesn't carry. */
  key: keyof T & keyof F & string;
  /** Column header and legend label. */
  label: string;
  kind: AttributeKind;
  /** Display string for the item's value in this column. */
  format: (item: T) => string;
}

export const ATTRIBUTES = [
  { key: "gender", label: "Gender", kind: "scalar", format: (c: Character) => c.gender },
  { key: "role", label: "Role", kind: "scalar", format: (c: Character) => c.role },
  { key: "weapon", label: "Weapon", kind: "scalar", format: (c: Character) => c.weapon },
  {
    key: "element",
    label: "Element",
    kind: "element",
    format: (c: Character) => (c.element.length ? c.element.join(", ") : "—"),
  },
  {
    key: "act_introduced",
    label: "Act",
    kind: "direction",
    format: (c: Character) => String(c.act_introduced),
  },
  { key: "category", label: "Category", kind: "scalar", format: (c: Character) => c.category },
  { key: "affiliation", label: "Affiliation", kind: "array", format: (c: Character) => c.affiliation.join(" • ") },
  { key: "zone", label: "Zone", kind: "scalar", format: (c: Character) => c.zone },
] as const satisfies readonly AttributeDescriptor<Character, ClassicGuessFeedback>[];

/** Column order for the share grid (feedback keys only). */
export const FIELD_ORDER = ATTRIBUTES.map((a) => a.key);

/** Pictos-mode comparison columns (the future-mode seam). Same descriptor shape
 *  as ATTRIBUTES, keyed to Picto. Compare logic and a share grid land in a later
 *  phase; this is declarative metadata only. */
export const PICTOS_ATTRIBUTES = [
  { key: "type", label: "Type", kind: "scalar", format: (p: Picto) => p.type },
  {
    key: "stats",
    label: "Stats",
    kind: "array",
    format: (p: Picto) => (p.stats.length ? p.stats.join(" • ") : "—"),
  },
  {
    key: "lumina_cost",
    label: "Lumina",
    kind: "direction",
    format: (p: Picto) => String(p.lumina_cost),
  },
  { key: "effect_category", label: "Effect", kind: "scalar", format: (p: Picto) => p.effect_category },
  { key: "source", label: "Source", kind: "scalar", format: (p: Picto) => p.source },
  { key: "zone_obtained", label: "Zone", kind: "scalar", format: (p: Picto) => p.zone_obtained },
  {
    key: "act_introduced",
    label: "Act",
    kind: "direction",
    format: (p: Picto) => String(p.act_introduced),
  },
] as const satisfies readonly AttributeDescriptor<Picto, PictoGuessFeedback>[];

/** Column order for the pictos share grid (feedback keys only). */
export const PICTOS_FIELD_ORDER = PICTOS_ATTRIBUTES.map((a) => a.key);

/** Weapons-mode comparison columns (the future-mode seam). Same descriptor shape
 *  as ATTRIBUTES, keyed to Weapon. element is scalar here (single value), unlike
 *  Classic's multi-valued element; only scaling_stats is set-compared. */
export const WEAPONS_ATTRIBUTES = [
  {
    key: "wielder",
    label: "Wielder",
    kind: "array",
    format: (w: Weapon) => (w.wielder.length ? w.wielder.join(" • ") : "—"),
  },
  { key: "element", label: "Element", kind: "scalar", format: (w: Weapon) => w.element },
  {
    key: "max_power",
    label: "Max Power",
    kind: "direction",
    format: (w: Weapon) => String(w.max_power),
  },
  {
    key: "scaling_stats",
    label: "Scaling",
    kind: "array",
    format: (w: Weapon) => (w.scaling_stats.length ? w.scaling_stats.join(" • ") : "—"),
  },
  { key: "source", label: "Source", kind: "scalar", format: (w: Weapon) => w.source },
  {
    key: "act_introduced",
    label: "Act",
    kind: "direction",
    format: (w: Weapon) => String(w.act_introduced),
  },
] as const satisfies readonly AttributeDescriptor<Weapon, WeaponGuessFeedback>[];

/** Column order for the weapons share grid (feedback keys only). */
export const WEAPONS_FIELD_ORDER = WEAPONS_ATTRIBUTES.map((a) => a.key);

/** Bosses-mode comparison columns (the future-mode seam). Same descriptor shape
 *  as ATTRIBUTES, keyed to Boss. weakness/resistance are set-compared (may be
 *  empty); category/location/encounter are scalar; act_introduced is directional. */
export const BOSSES_ATTRIBUTES = [
  {
    key: "weakness",
    label: "Weakness",
    kind: "array",
    format: (b: Boss) => (b.weakness.length ? b.weakness.join(" • ") : "—"),
  },
  {
    key: "resistance",
    label: "Resistance",
    kind: "array",
    format: (b: Boss) => (b.resistance.length ? b.resistance.join(" • ") : "—"),
  },
  { key: "category", label: "Category", kind: "scalar", format: (b: Boss) => b.category },
  { key: "location", label: "Location", kind: "scalar", format: (b: Boss) => b.location },
  { key: "encounter", label: "Encounter", kind: "scalar", format: (b: Boss) => b.encounter },
  {
    key: "act_introduced",
    label: "Act",
    kind: "direction",
    format: (b: Boss) => String(b.act_introduced),
  },
] as const satisfies readonly AttributeDescriptor<Boss, BossGuessFeedback>[];

/** Column order for the bosses share grid (feedback keys only). */
export const BOSSES_FIELD_ORDER = BOSSES_ATTRIBUTES.map((a) => a.key);

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
