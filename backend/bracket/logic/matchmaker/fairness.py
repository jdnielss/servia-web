from __future__ import annotations

from dataclasses import dataclass
from statistics import pstdev
from typing import Sequence

from bracket.logic.matchmaker.types import EngineGame


def partner_matrix(games: Sequence[EngineGame]) -> dict[tuple[int, int], int]:
    """Count how often each unordered pair of players were partners (same team)."""
    counts: dict[tuple[int, int], int] = {}
    for g in games:
        for side in (g.team1, g.team2):
            if len(side) >= 2:
                a, b = sorted((side[0], side[1]))
                key = (a, b)
                counts[key] = counts.get(key, 0) + 1
    return counts


def game_counts_per_player(games: Sequence[EngineGame]) -> dict[int, int]:
    counts: dict[int, int] = {}
    for g in games:
        for pid in g.team1 + g.team2:
            counts[pid] = counts.get(pid, 0) + 1
    return counts


def fairness_score_from_partner_counts(counts: dict[tuple[int, int], int]) -> float:
    """Lower is fairer — std dev of partner pairing frequencies for pairs that paired at least once."""
    if not counts:
        return 0.0
    vals = list(counts.values())
    if len(vals) < 2:
        return 0.0
    return float(pstdev(vals))


@dataclass(frozen=True, slots=True)
class FairnessReport:
    fairness_score: float
    partner_counts: dict[tuple[int, int], int]
    games_per_player: dict[int, int]


def build_fairness_report(games: Sequence[EngineGame]) -> FairnessReport:
    pm = partner_matrix(games)
    gpp = game_counts_per_player(games)
    score = fairness_score_from_partner_counts(pm)
    return FairnessReport(
        fairness_score=score,
        partner_counts=pm,
        games_per_player=gpp,
    )
