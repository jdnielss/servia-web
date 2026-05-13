from __future__ import annotations

import random
from typing import Sequence

from bracket.logic.matchmaker.types import EngineGame


def _unit_player_ids(unit: Sequence[int]) -> list[int]:
    return list(unit)


def generate_americano_rounds(
    units: list[list[int]],
    courts: int,
    num_rounds: int,
    rng: random.Random,
    *,
    team_mode: bool,
) -> list[list[EngineGame]]:
    """
    Rotate/shuffle units across courts each round.
    Individual: 4 single-player units per court, paired as (0,1) vs (2,3) after ordering chunk.
    Team: 2 multi-player units per court, match is unit vs unit.
    """
    if not units:
        raise ValueError("No units")
    units_per_court = 2 if team_mode else 4
    needed = courts * units_per_court
    if len(units) < needed:
        raise ValueError("Not enough players/units for court count")

    working = list(units)
    # Shuffle once for randomness, then use cyclic selection to keep participation fair.
    rng.shuffle(working)
    rounds: list[list[EngineGame]] = []

    n = len(working)
    # Step forward by one full round of participants each round.
    # This gives each unit a near-equal chance to be selected, and reaches perfect equality
    # as soon as (rounds * needed) is divisible by n.
    for round_idx in range(num_rounds):
        start = (round_idx * needed) % n
        if start + needed <= n:
            chunk = working[start : start + needed]
        else:
            # wrap-around
            chunk = working[start:] + working[: (start + needed) % n]
        round_games: list[EngineGame] = []
        for c in range(courts):
            block = chunk[c * units_per_court : (c + 1) * units_per_court]
            if team_mode:
                u1, u2 = block[0], block[1]
                round_games.append(
                    EngineGame(court_index=c, team1=_unit_player_ids(u1), team2=_unit_player_ids(u2))
                )
            else:
                # Mix within the block to reduce repeated pairings when n is small.
                if rng.random() < 0.5:
                    order = [0, 1, 2, 3]
                else:
                    order = [0, 2, 1, 3]
                p0, p1, p2, p3 = (block[order[0]][0], block[order[1]][0], block[order[2]][0], block[order[3]][0])
                round_games.append(
                    EngineGame(court_index=c, team1=[p0, p1], team2=[p2, p3])
                )
        rounds.append(round_games)

    return rounds
