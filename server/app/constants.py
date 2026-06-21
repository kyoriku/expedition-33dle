"""Shared application constants."""

from datetime import date

# First day with a puzzle; puzzle_number = (puzzle_date - LAUNCH_DATE).days + 1.
# Lives in the app package (not the seed script) because /api/guess will need
# the same value for puzzle-number math. Bump at public launch for a fresh #1.
# Reset to the dynamic-scheduling cutover (Phase 8); the prior pre-trim puzzle
# table was dev-only data and is not preserved.
LAUNCH_DATE = date(2026, 6, 14)

# Deterministic schedule seed; shared by the scheduling service. Changing this
# reshuffles all future puzzles, so treat it as frozen for the live roster.
SHUFFLE_SEED = 33

# Per-mode guess caps. MIRROR of the client values in client/src/lib/stats.ts
# (CLASSIC_MAX_GUESSES / PICTOS_MAX_GUESSES) — keep in sync. Used to gate /reveal:
# the answer is returned only after a solve or this many distinct valid guesses.
CLASSIC_MAX_GUESSES = 6
PICTOS_MAX_GUESSES = 8
