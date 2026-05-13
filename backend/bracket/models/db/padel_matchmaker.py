from enum import auto
from typing import Any, Literal, Self

import json

from heliclockter import datetime_utc
from pydantic import Field, model_validator

from bracket.models.db.shared import BaseModelORM
from bracket.utils.id_types import (
    PadelMatchGameId,
    PadelMatchId,
    PadelMatchPlayerId,
    PadelMatchRoundId,
    UserId,
)
from bracket.utils.types import EnumAutoStr


class PadelMatchStatus(EnumAutoStr):
    DRAFT = auto()
    PREVIEW = auto()
    ACTIVE = auto()
    COMPLETED = auto()


class PadelMatchRoundStatus(EnumAutoStr):
    PREVIEW = auto()
    ACTIVE = auto()
    DONE = auto()


class PadelMatchGameStatus(EnumAutoStr):
    PENDING = auto()
    DONE = auto()


class PadelMatchPlayerSource(EnumAutoStr):
    MANUAL = auto()
    PLAYER = auto()


class ScoringType(EnumAutoStr):
    POINT = auto()
    NORMAL = auto()


class PadelMatchPlayerInput(BaseModelORM):
    name: str = Field(..., min_length=1)
    source: PadelMatchPlayerSource = PadelMatchPlayerSource.MANUAL
    order_index: int = Field(..., ge=0)


class MatchmakerSettings(BaseModelORM):
    """Stored in settings_json; defaults match create form."""

    sort_leaderboard_by: Literal["points", "wins"] = "points"
    initial_player_order: Literal["registration", "random"] = "registration"
    hide_public_leaderboard: bool = False
    american_rounds_mode: Literal["full", "custom"] = "full"
    custom_round_count: int | None = Field(default=None, ge=1, le=999)
    simulation_seed: int | None = None
    normal_format: Literal[
        "FIRST_TO_3",
        "FIRST_TO_4",
        "FIRST_TO_5",
        "FIRST_TO_6",
        "FIRST_TO_7",
        "TOTAL_OF_3",
        "TOTAL_OF_4",
        "TOTAL_OF_5",
        "TOTAL_OF_6",
        "TOTAL_OF_7",
        "BEST_OF_3",
        "TOTAL_GAMES_4",
        "TOTAL_GAMES_6",
    ] = "FIRST_TO_7"


class PadelMatchCreateBody(BaseModelORM):
    name: str = Field(..., min_length=1)
    match_type: str = Field(..., min_length=1)
    scoring_type: ScoringType
    points_per_match: int = Field(..., ge=1)
    courts: int = Field(..., ge=1, le=32)
    start_time: datetime_utc
    players: list[PadelMatchPlayerInput]
    settings: MatchmakerSettings = MatchmakerSettings()


class PadelMatchPlayerRow(BaseModelORM):
    id: PadelMatchPlayerId
    padel_match_id: PadelMatchId
    name: str
    source: str
    order_index: int


class PadelMatchRow(BaseModelORM):
    id: PadelMatchId
    created: datetime_utc
    user_id: UserId
    name: str
    match_type: str
    scoring_type: str
    points_per_match: int
    courts: int
    start_time: datetime_utc
    status: str
    settings_json: dict[str, Any] | str
    dashboard_public: bool | None = None
    dashboard_endpoint: str | None = None

    @model_validator(mode="after")
    def decode_settings_json(self) -> Self:
        if isinstance(self.settings_json, str):
            try:
                self.settings_json = json.loads(self.settings_json)
            except Exception as exc:
                raise ValueError("Invalid settings_json") from exc
        return self


class PadelMatchRoundRow(BaseModelORM):
    id: PadelMatchRoundId
    padel_match_id: PadelMatchId
    round_number: int
    status: str


class PadelMatchGameRow(BaseModelORM):
    id: PadelMatchGameId
    round_id: PadelMatchRoundId
    court_index: int
    court_name: str | None
    team1_player_ids: list[int]
    team2_player_ids: list[int]
    score1: int | None
    score2: int | None
    sets_json: list[list[int]] | None = None
    status: str


class PadelMatchGamePatchBody(BaseModelORM):
    score1: int | None = Field(default=None, ge=0)
    score2: int | None = Field(default=None, ge=0)
    sets_json: list[list[int]] | None = None
    court_name: str | None = Field(default=None, min_length=1, max_length=120)

    @model_validator(mode="after")
    def scores_or_court(self) -> Self:
        # Tennis scoring uses sets_json; we compute score1/score2 totals from sets.
        if self.sets_json is not None:
            if not self.sets_json:
                raise ValueError("sets_json must not be empty")
            for s in self.sets_json:
                if len(s) != 2:
                    raise ValueError("Each set must be [games_team1, games_team2]")
                if any((not isinstance(x, int) or x < 0) for x in s):
                    raise ValueError("Set scores must be non-negative ints")
            return self

        has_scores = self.score1 is not None and self.score2 is not None
        only_scores = self.score1 is not None or self.score2 is not None
        if only_scores and not has_scores:
            raise ValueError("score1 and score2 must be set together")
        if not has_scores and self.court_name is None:
            raise ValueError("Provide scores and/or court_name")
        return self


class PadelMatchSimulateBody(BaseModelORM):
    seed: int | None = None
    preview_rounds: int | None = Field(default=None, ge=1, le=200)
