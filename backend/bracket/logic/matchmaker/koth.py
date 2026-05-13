from __future__ import annotations

import random

from bracket.logic.matchmaker.types import EngineGame


def generate_koth_round_one(
    units: list[list[int]],
    courts: int,
    rng: random.Random,
) -> list[EngineGame]:
    """
    One match per court: two sides (doubles).
    Individual: 4 single-player units per court.
    Team mode: 2 pair-units per court.
    """
    team_mode = len(units[0]) > 1
    per_court = 2 if team_mode else 4
    need = courts * per_court
    if len(units) < need:
        raise ValueError("Not enough players/units for KOTH court count")

    order = list(units)
    rng.shuffle(order)
    chunk = order[:need]

    games: list[EngineGame] = []
    if team_mode:
        for c in range(courts):
            u1, u2 = chunk[2 * c], chunk[2 * c + 1]
            games.append(EngineGame(court_index=c, team1=list(u1), team2=list(u2)))
    else:
        for c in range(courts):
            p = chunk[c * 4 : (c + 1) * 4]
            games.append(
                EngineGame(
                    court_index=c,
                    team1=[p[0][0], p[1][0]],
                    team2=[p[2][0], p[3][0]],
                )
            )
    return games


def generate_koth_round_from_points(
    units: list[list[int]],
    courts: int,
    unit_points: list[float],
    rng: random.Random,
) -> list[EngineGame]:
    """Later KOTH rounds: rank units by accumulated points, fill courts top-down."""
    if len(unit_points) != len(units):
        raise ValueError("Standings length mismatch")

    team_mode = len(units[0]) > 1
    per_court = 2 if team_mode else 4
    need = courts * per_court
    if len(units) < need:
        raise ValueError("Not enough players/units for KOTH court count")

    order = sorted(range(len(units)), key=lambda i: (-unit_points[i], rng.random()))
    chunk = [units[i] for i in order[:need]]

    games: list[EngineGame] = []
    if team_mode:
        for c in range(courts):
            u1, u2 = chunk[2 * c], chunk[2 * c + 1]
            games.append(EngineGame(court_index=c, team1=list(u1), team2=list(u2)))
    else:
        for c in range(courts):
            p = chunk[c * 4 : (c + 1) * 4]
            games.append(
                EngineGame(
                    court_index=c,
                    team1=[p[0][0], p[1][0]],
                    team2=[p[2][0], p[3][0]],
                )
            )
    return games
