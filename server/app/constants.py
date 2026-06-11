"""Shared application constants."""

from datetime import date

# First day with a puzzle; puzzle_number = (puzzle_date - LAUNCH_DATE).days + 1.
# Lives in the app package (not the seed script) because /api/guess will need
# the same value for puzzle-number math. Bump at public launch for a fresh #1.
LAUNCH_DATE = date(2026, 6, 11)
