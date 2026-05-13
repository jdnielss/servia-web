from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class EngineGame:
    court_index: int
    team1: list[int]
    team2: list[int]
