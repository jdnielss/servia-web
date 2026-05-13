from __future__ import annotations

import random
from typing import Sequence

from bracket.logic.matchmaker.types import EngineGame


def _snake_four(pids: Sequence[int]) -> tuple[list[int], list[int]]:
    assert len(pids) == 4
    a, b, c, d = pids[0], pids[1], pids[2], pids[3]
    return [a, d], [b, c]


def generate_mexicano_preview_rounds(
    units: list[list[int]],
    courts: int,
    num_rounds: int,
    rng: random.Random,
    *,
    team_mode: bool,
) -> list[list[EngineGame]]:
    """Preview rounds using synthetic points between rounds (deterministic rng)."""
    units_per_court = 2 if team_mode else 4
    needed = courts * units_per_court
    if len(units) < needed:
        raise ValueError("Not enough players/units for court count")

    n_u = len(units)
    points = [0 for _ in range(n_u)]

    rounds_out: list[list[EngineGame]] = []

    for _ in range(num_rounds):
        order = sorted(range(n_u), key=lambda i: (-points[i], i))
        rank_order = order[:needed]

        games: list[EngineGame] = []
        if team_mode:
            for c in range(courts):
                i1 = rank_order[2 * c]
                i2 = rank_order[2 * c + 1]
                games.append(
                    EngineGame(
                        court_index=c,
                        team1=list(units[i1]),
                        team2=list(units[i2]),
                    )
                )
                wi = i1 if rng.random() < 0.5 else i2
                points[wi] += 3
        else:
            for c in range(courts):
                four = rank_order[4 * c : 4 * (c + 1)]
                pids = [units[i][0] for i in four]
                t1, t2 = _snake_four(pids)
                games.append(EngineGame(court_index=c, team1=t1, team2=t2))
                # winner side fake scoring on unit indices four
                win_side = t1 if rng.random() < 0.5 else t2
                for pid in win_side:
                    # map pid -> unit index (single-player units)
                    ui = next(j for j in range(n_u) if units[j][0] == pid)
                    points[ui] += 3

        rounds_out.append(games)

    return rounds_out


def generate_mexicano_next_round(
    units: list[list[int]],
    courts: int,
    unit_points: list[float],
    *,
    team_mode: bool,
) -> list[EngineGame]:
    units_per_court = 2 if team_mode else 4
    needed = courts * units_per_court
    order = sorted(range(len(units)), key=lambda i: (-unit_points[i], i))[:needed]

    games: list[EngineGame] = []
    if team_mode:
        for c in range(courts):
            i1 = order[2 * c]
            i2 = order[2 * c + 1]
            games.append(EngineGame(court_index=c, team1=list(units[i1]), team2=list(units[i2])))
    else:
        for c in range(courts):
            four = order[4 * c : 4 * (c + 1)]
            pids = [units[i][0] for i in four]
            t1, t2 = _snake_four(pids)
            games.append(EngineGame(court_index=c, team1=t1, team2=t2))
    return games
