// Per-mode CSS-grid templates for the guess grid / row / answer-reveal. Kept as
// STATIC literal strings (no runtime building) so Tailwind's JIT scanner picks up
// the arbitrary-value column tracks. One literal per mode; the column count is the
// name column + that mode's attribute count (8 classic, 7 pictos, 6 weapons/bosses).
// Same cell sizes / name-column widths across modes so the grids line up exactly.
// Name column (widths verified in headless Chrome against every roster name):
// 220px below md keeps the scrollable grid compact on phones (14px text, 56px
// portrait); md bumps portrait to 64px and text to 16px, so 248px is the minimum
// that clears the widest single roster word ("Contamination", bold win state,
// 155px) without clipping; 280px at lg clears it with the 80px portrait.
// 288px is the hard lg ceiling — classic's 8 columns + gaps (816px) must stay
// inside max-w-6xl minus the page padding (1104px); 280 leaves a little air.

export const CLASSIC_GRID_TEMPLATE =
  "grid w-max mx-auto grid-cols-[220px_repeat(8,92px)] gap-1.5 " +
  "md:grid-cols-[248px_repeat(8,92px)] lg:grid-cols-[280px_repeat(8,96px)]";

export const PICTOS_GRID_TEMPLATE =
  "grid w-max mx-auto grid-cols-[220px_repeat(7,92px)] gap-1.5 " +
  "md:grid-cols-[248px_repeat(7,92px)] lg:grid-cols-[280px_repeat(7,96px)]";

export const WEAPONS_GRID_TEMPLATE =
  "grid w-max mx-auto grid-cols-[220px_repeat(6,92px)] gap-1.5 " +
  "md:grid-cols-[248px_repeat(6,92px)] lg:grid-cols-[280px_repeat(6,96px)]";

export const BOSSES_GRID_TEMPLATE =
  "grid w-max mx-auto grid-cols-[220px_repeat(6,92px)] gap-1.5 " +
  "md:grid-cols-[248px_repeat(6,92px)] lg:grid-cols-[280px_repeat(6,96px)]";
