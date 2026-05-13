import random

from bracket.logic.matchmaker.americano import generate_americano_rounds
from bracket.logic.matchmaker.koth import generate_koth_round_one
from bracket.logic.matchmaker.mexicano import generate_mexicano_preview_rounds


def test_americano_two_courts_eight_players() -> None:
    units = [[i] for i in range(8)]
    rng = random.Random(42)
    rounds = generate_americano_rounds(units, courts=2, num_rounds=4, rng=rng, team_mode=False)
    assert len(rounds) == 4
    assert all(len(r) == 2 for r in rounds)


def test_mexicano_preview_runs() -> None:
    units = [[i] for i in range(8)]
    rng = random.Random(1)
    rounds = generate_mexicano_preview_rounds(units, courts=2, num_rounds=3, rng=rng, team_mode=False)
    assert len(rounds) == 3


def test_koth_round_one() -> None:
    units = [[i] for i in range(8)]
    rng = random.Random(0)
    r1 = generate_koth_round_one(units, courts=2, rng=rng)
    assert len(r1) == 2
