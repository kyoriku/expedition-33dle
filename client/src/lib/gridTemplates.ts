// Per-mode CSS-grid templates for the guess grid / row / answer-reveal. Kept as
// STATIC literal strings (no runtime building) so Tailwind's JIT scanner picks up
// the arbitrary-value column tracks. One literal per mode; the column count is the
// name column + that mode's attribute count (8 classic, 7 pictos, 6 weapons/bosses).
// Same cell sizes / name-column widths across modes so the grids line up exactly.
// Name column width is sized for the longest single roster word ("Vulnerability",
// bold win state) next to the portrait: 236px clears it at md sizes, 280px at lg.
// 288px is the hard lg ceiling — classic's 8 columns + gaps (816px) must stay
// inside max-w-6xl minus the page padding (1104px); 280 leaves a little air.

export const CLASSIC_GRID_TEMPLATE =
  "grid w-max mx-auto grid-cols-[236px_repeat(8,92px)] gap-1.5 " +
  "lg:grid-cols-[280px_repeat(8,96px)]";

export const PICTOS_GRID_TEMPLATE =
  "grid w-max mx-auto grid-cols-[236px_repeat(7,92px)] gap-1.5 " +
  "lg:grid-cols-[280px_repeat(7,96px)]";

export const WEAPONS_GRID_TEMPLATE =
  "grid w-max mx-auto grid-cols-[236px_repeat(6,92px)] gap-1.5 " +
  "lg:grid-cols-[280px_repeat(6,96px)]";

export const BOSSES_GRID_TEMPLATE =
  "grid w-max mx-auto grid-cols-[236px_repeat(6,92px)] gap-1.5 " +
  "lg:grid-cols-[280px_repeat(6,96px)]";
