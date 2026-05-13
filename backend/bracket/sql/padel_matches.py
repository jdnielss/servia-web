from __future__ import annotations

import json
from typing import Any

from bracket.database import database
from bracket.models.db.padel_matchmaker import (
    PadelMatchCreateBody,
    PadelMatchGameRow,
    PadelMatchPlayerRow,
    PadelMatchRoundRow,
    PadelMatchRow,
    PadelMatchStatus,
)
from bracket.utils.id_types import (
    PadelMatchGameId,
    PadelMatchId,
    PadelMatchPlayerId,
    PadelMatchRoundId,
    UserId,
)


async def sql_insert_padel_match(
    user_id: UserId,
    body: PadelMatchCreateBody,
    *,
    dashboard_endpoint: str,
    dashboard_public: bool = True,
) -> PadelMatchId:
    settings = body.settings.model_dump()
    query = """
        INSERT INTO padel_matches (
            user_id,
            name,
            match_type,
            scoring_type,
            points_per_match,
            courts,
            start_time,
            status,
            settings_json,
            dashboard_public,
            dashboard_endpoint
        )
        VALUES (
            :user_id,
            :name,
            :match_type,
            :scoring_type,
            :points_per_match,
            :courts,
            :start_time,
            :status,
            CAST(:settings_json AS JSONB),
            :dashboard_public,
            :dashboard_endpoint
        )
        RETURNING id
        """
    row = await database.fetch_one(
        query=query,
        values={
            "user_id": user_id,
            "name": body.name,
            "match_type": body.match_type,
            "scoring_type": body.scoring_type.value,
            "points_per_match": body.points_per_match,
            "courts": body.courts,
            "start_time": body.start_time,
            "status": PadelMatchStatus.DRAFT.value,
            "settings_json": json.dumps(settings),
            "dashboard_public": dashboard_public,
            "dashboard_endpoint": dashboard_endpoint,
        },
    )
    assert row is not None
    return PadelMatchId(row["id"])


async def sql_insert_players(
    padel_match_id: PadelMatchId, names_sources: list[tuple[str, str, int]]
) -> None:
    query = """
        INSERT INTO padel_match_players (padel_match_id, name, source, order_index)
        VALUES (:padel_match_id, :name, :source, :order_index)
        """
    for name, source, order_index in names_sources:
        await database.execute(
            query=query,
            values={
                "padel_match_id": padel_match_id,
                "name": name,
                "source": source,
                "order_index": order_index,
            },
        )


async def sql_get_padel_match(padel_match_id: PadelMatchId, user_id: UserId) -> PadelMatchRow | None:
    query = """
        SELECT * FROM padel_matches
        WHERE id = :id AND user_id = :user_id
        """
    row = await database.fetch_one(
        query=query, values={"id": padel_match_id, "user_id": user_id}
    )
    return PadelMatchRow.model_validate(dict(row)) if row is not None else None


async def sql_get_padel_match_by_endpoint(endpoint: str) -> PadelMatchRow | None:
    query = """
        SELECT *
        FROM padel_matches
        WHERE dashboard_endpoint = :endpoint
        AND dashboard_public IS TRUE
        """
    row = await database.fetch_one(query=query, values={"endpoint": endpoint})
    return PadelMatchRow.model_validate(dict(row)) if row is not None else None


async def sql_list_padel_matches(user_id: UserId) -> list[PadelMatchRow]:
    query = """
        SELECT * FROM padel_matches
        WHERE user_id = :user_id
        ORDER BY created DESC
        """
    rows = await database.fetch_all(query=query, values={"user_id": user_id})
    return [PadelMatchRow.model_validate(dict(r)) for r in rows]


async def sql_delete_padel_match(padel_match_id: PadelMatchId, user_id: UserId) -> None:
    query = """
        DELETE FROM padel_matches
        WHERE id = :id AND user_id = :user_id
        """
    await database.execute(query=query, values={"id": padel_match_id, "user_id": user_id})


async def sql_get_players(padel_match_id: PadelMatchId) -> list[PadelMatchPlayerRow]:
    query = """
        SELECT * FROM padel_match_players
        WHERE padel_match_id = :mid
        ORDER BY order_index ASC, id ASC
        """
    rows = await database.fetch_all(query=query, values={"mid": padel_match_id})
    return [PadelMatchPlayerRow.model_validate(dict(r)) for r in rows]


async def sql_delete_preview_rounds(padel_match_id: PadelMatchId) -> None:
    query = """
        DELETE FROM padel_match_rounds
        WHERE padel_match_id = :mid
        """
    await database.execute(query=query, values={"mid": padel_match_id})


async def sql_insert_round(
    padel_match_id: PadelMatchId, round_number: int, status: str
) -> PadelMatchRoundId:
    query = """
        INSERT INTO padel_match_rounds (padel_match_id, round_number, status)
        VALUES (:padel_match_id, :round_number, :status)
        RETURNING id
        """
    row = await database.fetch_one(
        query=query,
        values={
            "padel_match_id": padel_match_id,
            "round_number": round_number,
            "status": status,
        },
    )
    assert row is not None
    return PadelMatchRoundId(row["id"])


async def sql_insert_game(
    round_id: PadelMatchRoundId,
    court_index: int,
    court_name: str | None,
    team1: list[int],
    team2: list[int],
    status: str,
) -> PadelMatchGameId:
    query = """
        INSERT INTO padel_match_games (
            round_id, court_index, court_name,
            team1_player_ids, team2_player_ids, score1, score2, sets_json, status
        )
        VALUES (
            :round_id, :court_index, :court_name,
            :team1, :team2, NULL, NULL, NULL, :status
        )
        RETURNING id
        """
    row = await database.fetch_one(
        query=query,
        values={
            "round_id": round_id,
            "court_index": court_index,
            "court_name": court_name,
            "team1": team1,
            "team2": team2,
            "status": status,
        },
    )
    assert row is not None
    return PadelMatchGameId(row["id"])


async def sql_get_rounds(padel_match_id: PadelMatchId) -> list[PadelMatchRoundRow]:
    query = """
        SELECT * FROM padel_match_rounds
        WHERE padel_match_id = :mid
        ORDER BY round_number ASC
        """
    rows = await database.fetch_all(query=query, values={"mid": padel_match_id})
    return [PadelMatchRoundRow.model_validate(dict(r)) for r in rows]


async def sql_get_games_for_round(round_id: PadelMatchRoundId) -> list[PadelMatchGameRow]:
    query = """
        SELECT * FROM padel_match_games
        WHERE round_id = :rid
        ORDER BY court_index ASC
        """
    rows = await database.fetch_all(query=query, values={"rid": round_id})
    return [PadelMatchGameRow.model_validate(dict(r)) for r in rows]


async def sql_get_game(game_id: PadelMatchGameId) -> PadelMatchGameRow | None:
    query = "SELECT * FROM padel_match_games WHERE id = :id"
    row = await database.fetch_one(query=query, values={"id": game_id})
    return PadelMatchGameRow.model_validate(dict(row)) if row is not None else None


async def sql_update_match_status(padel_match_id: PadelMatchId, status: str) -> None:
    query = "UPDATE padel_matches SET status = :st WHERE id = :id"
    await database.execute(query=query, values={"st": status, "id": padel_match_id})


async def sql_update_round_status(round_id: PadelMatchRoundId, status: str) -> None:
    query = "UPDATE padel_match_rounds SET status = :st WHERE id = :id"
    await database.execute(query=query, values={"st": status, "id": round_id})


async def sql_update_game_scores(
    game_id: PadelMatchGameId, score1: int, score2: int, status: str
) -> None:
    query = """
        UPDATE padel_match_games
        SET score1 = :s1, score2 = :s2, status = :st
        WHERE id = :id
        """
    await database.execute(
        query=query, values={"s1": score1, "s2": score2, "st": status, "id": game_id}
    )


async def sql_update_game_sets(
    game_id: PadelMatchGameId,
    score1: int,
    score2: int,
    sets_json: list[list[int]],
    status: str,
) -> None:
    query = """
        UPDATE padel_match_games
        SET score1 = :s1, score2 = :s2, sets_json = CAST(:sets_json AS JSONB), status = :st
        WHERE id = :id
        """
    await database.execute(
        query=query,
        values={
            "s1": score1,
            "s2": score2,
            "sets_json": json.dumps(sets_json),
            "st": status,
            "id": game_id,
        },
    )


async def sql_update_game_court_name(game_id: PadelMatchGameId, court_name: str) -> None:
    query = "UPDATE padel_match_games SET court_name = :n WHERE id = :id"
    await database.execute(query=query, values={"n": court_name, "id": game_id})


async def sql_update_court_name_for_match(
    padel_match_id: PadelMatchId, court_index: int, court_name: str
) -> None:
    """
    Rename a court across all rounds/games in the same matchmaker session.
    """
    query = """
        UPDATE padel_match_games g
        SET court_name = :court_name
        FROM padel_match_rounds r
        WHERE g.round_id = r.id
          AND r.padel_match_id = :padel_match_id
          AND g.court_index = :court_index
        """
    await database.execute(
        query=query,
        values={
            "court_name": court_name,
            "padel_match_id": padel_match_id,
            "court_index": court_index,
        },
    )


async def sql_get_round_by_id(round_id: PadelMatchRoundId) -> PadelMatchRoundRow | None:
    query = "SELECT * FROM padel_match_rounds WHERE id = :id"
    row = await database.fetch_one(query=query, values={"id": round_id})
    return PadelMatchRoundRow.model_validate(dict(row)) if row is not None else None


async def sql_update_settings_json(padel_match_id: PadelMatchId, settings: dict[str, Any]) -> None:
    query = "UPDATE padel_matches SET settings_json = CAST(:js AS JSONB) WHERE id = :id"
    await database.execute(
        query=query, values={"js": json.dumps(settings), "id": padel_match_id}
    )


async def sql_get_all_games_for_match(padel_match_id: PadelMatchId) -> list[PadelMatchGameRow]:
    query = """
        SELECT g.*
        FROM padel_match_games g
        INNER JOIN padel_match_rounds r ON g.round_id = r.id
        WHERE r.padel_match_id = :mid
        ORDER BY r.round_number, g.court_index
        """
    rows = await database.fetch_all(query=query, values={"mid": padel_match_id})
    return [PadelMatchGameRow.model_validate(dict(x)) for x in rows]
