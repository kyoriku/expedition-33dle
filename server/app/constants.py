"""Shared application constants."""

from datetime import date

# First day with a puzzle; puzzle_number = (puzzle_date - LAUNCH_DATE).days + 1.
# Lives in the app package (not the seed script) because /api/guess will need
# the same value for puzzle-number math. Set to the public launch day (puzzle
# #1) — FROZEN once real players hold streak state: changing it reshuffles
# every day's answer.
LAUNCH_DATE = date(2026, 8, 1)

# Deterministic schedule seed; shared by the scheduling service. Changing this
# reshuffles all future puzzles, so treat it as frozen for the live roster.
SHUFFLE_SEED = 33

# Valid `act_introduced` values — the game has 3 acts (the former "Act 4" / DLC
# content was folded into Act 3). Single source of truth for the seed validators
# (and the upcoming boss seed) so a new category can't drift.
VALID_ACTS = (1, 2, 3)

# Per-mode guess caps. MIRROR of the client values in client/src/lib/stats.ts
# (CLASSIC_MAX_GUESSES / PICTOS_MAX_GUESSES / WEAPONS_MAX_GUESSES / BOSSES_MAX_GUESSES)
# — keep in sync. Used to gate /reveal: the answer is returned only after a solve
# or this many distinct valid guesses.
CLASSIC_MAX_GUESSES = 6
PICTOS_MAX_GUESSES = 8
WEAPONS_MAX_GUESSES = 8
BOSSES_MAX_GUESSES = 7
