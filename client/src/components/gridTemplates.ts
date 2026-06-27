// Per-mode CSS-grid templates for the guess grid / row / answer-reveal. Kept as
// STATIC literal strings (no runtime building) so Tailwind's JIT scanner picks up
// the arbitrary-value column tracks. One literal per mode; the column count is the
// name column + that mode's attribute count (8 classic, 7 pictos, 6 weapons/bosses).
// Same cell sizes / name-column widths across modes so the grids line up exactly.

export const CLASSIC_GRID_TEMPLATE =
  "grid w-max mx-auto grid-cols-[200px_repeat(8,92px)] gap-1.5 " +
  "lg:grid-cols-[250px_repeat(8,96px)]";

export const PICTOS_GRID_TEMPLATE =
  "grid w-max mx-auto grid-cols-[200px_repeat(7,92px)] gap-1.5 " +
  "lg:grid-cols-[250px_repeat(7,96px)]";

export const WEAPONS_GRID_TEMPLATE =
  "grid w-max mx-auto grid-cols-[200px_repeat(6,92px)] gap-1.5 " +
  "lg:grid-cols-[250px_repeat(6,96px)]";

export const BOSSES_GRID_TEMPLATE =
  "grid w-max mx-auto grid-cols-[200px_repeat(6,92px)] gap-1.5 " +
  "lg:grid-cols-[250px_repeat(6,96px)]";
