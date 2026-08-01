"""Seed membership guard: the count gate and the read/gate/delete prune phases.

No DB — the decision functions are pure, and the phase wiring is driven by a
fake connection that records every executed statement. The wiring tests are
the point: they prove a tripped gate issues ZERO deletes, which is the actual
failure mode the guard exists for (roster membership is frozen while live).
"""

import asyncio

import pytest

from scripts.seed import (
    EXPECTED_COUNTS,
    MODES,
    check_expected_counts,
    check_prune_allowed,
    prune_all,
)


class FakeResult:
    def __init__(self, rows=None, rowcount=0):
        self._rows = rows or []
        self.rowcount = rowcount

    def all(self):
        return self._rows


class FakeConn:
    """Records executed statements; serves canned SELECT results per MODES order."""

    def __init__(self, candidates_per_mode: list[list[str]]):
        self.executed = []
        self._selects = list(candidates_per_mode)
        self._next = 0

    async def execute(self, stmt):
        self.executed.append(stmt)
        if type(stmt).__name__ == "Select":
            rows = [(name,) for name in self._selects[self._next]]
            self._next += 1
            return FakeResult(rows=rows)
        return FakeResult(rowcount=1)

    def deletes(self):
        return [s for s in self.executed if type(s).__name__ == "Delete"]


# --- decision level -------------------------------------------------------


def test_expected_counts_match_current_seed_json():
    """The committed rosters pass the gate — and pin the frozen sizes."""
    counts = {mode: len(rows) for mode, _, rows in MODES}
    assert counts == EXPECTED_COUNTS  # 33 / 201 / 116 / 50
    assert check_expected_counts(counts) == []


def test_count_mismatch_produces_message_per_offending_mode():
    counts = dict(EXPECTED_COUNTS)
    counts["bosses"] -= 1
    counts["weapons"] += 2
    messages = check_expected_counts(counts)
    assert len(messages) == 2
    joined = "\n".join(messages)
    assert "bosses: expected 50 entries, found 49" in joined
    assert "weapons: expected 116 entries, found 118" in joined


def test_prune_gate_blocks_without_allow():
    msg = check_prune_allowed("bosses", ["Ghost Boss", "Another"], allow=False)
    assert msg is not None
    assert "bosses" in msg and "Ghost Boss" in msg and "Another" in msg


def test_prune_gate_passes_with_allow():
    assert check_prune_allowed("bosses", ["Ghost Boss"], allow=True) is None


def test_prune_gate_passes_on_empty_candidates():
    # The empty-DB first deploy: nothing to prune is always allowed.
    assert check_prune_allowed("bosses", [], allow=False) is None


# --- wiring level ---------------------------------------------------------


def test_tripped_gate_issues_zero_deletes():
    conn = FakeConn([[], [], [], ["Ghost Boss"]])  # only bosses has strays
    with pytest.raises(SystemExit) as exc:
        asyncio.run(prune_all(conn, allow=False))
    assert exc.value.code == 1
    assert conn.deletes() == []


def test_allowed_prune_deletes_exactly_the_flagged_modes():
    conn = FakeConn([["Old Char"], [], [], ["Ghost Boss"]])
    counts = asyncio.run(prune_all(conn, allow=True))
    assert len(conn.deletes()) == 2  # characters + bosses only
    assert counts == {"characters": 1, "pictos": 0, "weapons": 0, "bosses": 1}


def test_clean_state_issues_zero_deletes_and_proceeds():
    conn = FakeConn([[], [], [], []])
    counts = asyncio.run(prune_all(conn, allow=False))
    assert conn.deletes() == []
    assert counts == {"characters": 0, "pictos": 0, "weapons": 0, "bosses": 0}
