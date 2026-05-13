from __future__ import annotations

import random
from typing import Literal, Sequence

from bracket.logic.matchmaker.americano import generate_americano_rounds
from bracket.logic.matchmaker.koth import generate_koth_round_one
from bracket.logic.matchmaker.mexicano import generate_mexicano_preview_rounds
from bracket.logic.matchmaker.types import EngineGame


def is_americano_family(match_type: str) -> bool:
    return match_type in (
        "AMERICANO",
        "TEAM_AMERICANO",
        "MIX_AMERICANO",
    )


def is_mexicano_family(match_type: str) -> bool:
    return match_type in (
        "MEXICANO",
        "TEAM_MEXICANO",
        "MIXICANO",
    )


def is_koth_family(match_type: str) -> bool:
    return match_type in ("KOTH", "TEAM_KOTH")


def build_units_from_players(
    player_ids_ordered: Sequence[int],
    *,
    team_mode: bool,
) -> list[list[int]]:
    """Individual: one id per unit. Team: consecutive pairs share a unit."""
    if not team_mode:
        return [[pid] for pid in player_ids_ordered]
    units: list[list[int]] = []
    it = iter(player_ids_ordered)
    for a in it:
        b = next(it, None)
        if b is None:
            raise ValueError("Odd player count in team mode")
        units.append([a, b])
    return units


def min_players_for_courts(courts: int, team_mode: bool) -> int:
    """Need `courts` simultaneous matches; each needs two teams (two sides)."""
    return courts * 4 if not team_mode else courts * 2


def estimate_rounds_americano(num_units: int, courts: int, mode: Literal["full", "custom"]) -> int:
    """Heuristic estimated rounds for UI."""
    if mode == "custom":
        return max(1, num_units)
    per_round = max(1, courts)
    base = max(6, (num_units + per_round - 1) // per_round * 2)
    return min(120, base + num_units)


def generate_full_schedule(
    *,
    match_type: str,
    units: list[list[int]],
    courts: int,
    num_rounds: int,
    seed: int,
) -> list[list[EngineGame]]:
    """Returns list of rounds; each round is a list of EngineGame (one per court)."""
    rng = random.Random(seed)
    if is_koth_family(match_type):
        r1 = generate_koth_round_one(units, courts, rng)
        return [r1]

    team_mode = len(units[0]) > 1

    if is_mexicano_family(match_type):
        return generate_mexicano_preview_rounds(units, courts, num_rounds, rng, team_mode=team_mode)

    if is_americano_family(match_type):
        return generate_americano_rounds(units, courts, num_rounds, rng, team_mode=team_mode)

    raise ValueError(f"Unsupported match_type: {match_type}")
