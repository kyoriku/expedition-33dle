"""Scheduling fingerprint guard — enforces the frozen-forever scheduling inputs.

LAUNCH_DATE, SHUFFLE_SEED, the per-mode salts, and the scheduling algorithm
itself (sort normalization, cycle math, the seeded shuffle, the boundary swap)
determine which answer maps to which date. Changing ANY of them silently
reshuffles every past and future daily answer (docs/DEPLOY.md, Standing
rules). This module turns that silent reshuffle into a hard crash: app.main
calls assert_scheduling_fingerprint() at import time, before FastAPI() exists
and before uvicorn binds, so Railway's /api/health check fails and the
previous deploy keeps serving.

Pure code — no DB, no I/O. Roster membership is deliberately NOT fingerprinted
here: the seed guard in scripts/seed.py (count gate + prune gate) owns it at
pre-deploy. Known residual gaps, accepted: a live DB drifting from the seed
JSON (e.g. a restored snapshot), and a router call site dropping its salt=
kwarg — neither is visible to a constant fingerprint.
"""

import hashlib
import json
from datetime import timedelta

from app.constants import LAUNCH_DATE, SHUFFLE_SEED
from app.routers.bosses import BOSSES_SALT
from app.routers.classic import CLASSIC_SALT
from app.routers.pictos import PICTOS_SALT
from app.routers.weapons import WEAPONS_SALT
from app.services.scheduling import get_puzzle_for_date

# The salts as actually used by the routers — imported, not copied, so editing
# a router's salt trips the guard. No cycle: routers never import this module.
MODE_SALTS = {
    "classic": CLASSIC_SALT,
    "pictos": PICTOS_SALT,
    "weapons": WEAPONS_SALT,
    "bosses": BOSSES_SALT,
}

# Deliberately NOT alphabetical: get_puzzle_for_date sorts internally, and a
# pre-sorted pool would make that normalization invisible to the fingerprint.
GOLDEN_POOL = ("golf", "alpha", "echo", "bravo", "foxtrot", "delta", "charlie")

# 30 days over 7 names = cycles 0..4; the no-consecutive-repeat boundary swap
# fires inside this window (bosses cycle 2, pictos cycle 3), so its logic is
# part of the digest.
GOLDEN_DAYS = 30


def compute_scheduling_fingerprint() -> str:
    """Digest over every input that decides which answer lands on which date.

    Behavioral, not just literal: the golden schedules pin the algorithm
    (seed arithmetic, salt offsets, sort normalization, cycle math, boundary
    swap) — even a Python upgrade that changed random.shuffle semantics would
    trip it. LAUNCH_DATE must also appear as a literal because the golden
    schedules are launch-relative and cannot see it.
    """
    golden = {
        salt: [
            get_puzzle_for_date(LAUNCH_DATE + timedelta(days=i), GOLDEN_POOL, salt)[0]
            for i in range(GOLDEN_DAYS)
        ]
        for salt in ["", *sorted(MODE_SALTS.values())]
    }
    payload = {
        "launch_date": LAUNCH_DATE.isoformat(),
        "shuffle_seed": SHUFFLE_SEED,
        "salts": MODE_SALTS,
        "golden": golden,
    }
    blob = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.blake2b(blob, digest_size=16).hexdigest()


# Recompute after a DELIBERATE scheduling change (the dummy DATABASE_URL is
# required only because importing the routers' salts pulls in app.db, which
# builds — but never connects — an engine at import):
#
#   cd server && DATABASE_URL=postgresql+asyncpg://x:x@localhost/x \
#     uv run --no-sync python -c "from app.services.scheduling_guard import compute_scheduling_fingerprint as c; print(c())"
EXPECTED_SCHEDULING_FINGERPRINT = "511510fa1c38c09e33b924f0c7053ee4"


def assert_scheduling_fingerprint() -> None:
    """Fail hard at startup if any frozen scheduling input changed."""
    computed = compute_scheduling_fingerprint()
    if computed == EXPECTED_SCHEDULING_FINGERPRINT:
        return
    raise RuntimeError(
        "Scheduling fingerprint mismatch — a frozen scheduling input changed.\n"
        f"  expected: {EXPECTED_SCHEDULING_FINGERPRINT}\n"
        f"  computed: {computed}\n"
        "LAUNCH_DATE, SHUFFLE_SEED, a per-mode salt, or the scheduling\n"
        "algorithm changed. This reshuffles every past and future daily\n"
        "answer, breaking streaks and share history for every player, with\n"
        "no undo. If this was accidental: revert the change. If it was\n"
        "deliberate and the consequence is understood: recompute the digest\n"
        "(command above EXPECTED_SCHEDULING_FINGERPRINT in\n"
        "app/services/scheduling_guard.py) and update the constant in the\n"
        "same commit."
    )
