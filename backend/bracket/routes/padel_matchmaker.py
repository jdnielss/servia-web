from __future__ import annotations

import json
import random
import secrets
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from starlette import status

from bracket.config import config
from bracket.database import database
from bracket.logic.matchmaker import (
    build_fairness_report,
    build_units_from_players,
    estimate_rounds_americano,
    generate_full_schedule,
    is_koth_family,
    min_players_for_courts,
)
from bracket.logic.matchmaker.koth import generate_koth_round_from_points
from bracket.logic.matchmaker.leaderboard import compute_leaderboard
from bracket.logic.matchmaker.types import EngineGame
from bracket.models.db.padel_matchmaker import (
    MatchmakerSettings,
    PadelMatchCreateBody,
    PadelMatchGamePatchBody,
    PadelMatchRow,
    PadelMatchSimulateBody,
    PadelMatchStatus,
    PadelMatchGameStatus,
    PadelMatchRoundStatus,
)
from bracket.models.db.user import UserPublic
from bracket.routes.auth import user_authenticated
from bracket.sql.padel_matches import (
    sql_delete_padel_match,
    sql_delete_preview_rounds,
    sql_get_all_games_for_match,
    sql_get_game,
    sql_get_games_for_round,
    sql_get_padel_match,
    sql_get_padel_match_by_endpoint,
    sql_get_players,
    sql_get_round_by_id,
    sql_get_rounds,
    sql_insert_game,
    sql_insert_padel_match,
    sql_insert_players,
    sql_insert_round,
    sql_list_padel_matches,
    sql_update_game_court_name,
    sql_update_court_name_for_match,
    sql_update_game_scores,
    sql_update_game_sets,
    sql_update_match_status,
    sql_update_round_status,
    sql_update_settings_json,
)
from bracket.utils.id_types import PadelMatchGameId, PadelMatchId, PadelMatchRoundId, UserId

router = APIRouter(prefix=config.api_prefix)


def is_team_mode(match_type: str) -> bool:
    return match_type in ("TEAM_AMERICANO", "TEAM_MEXICANO", "TEAM_KOTH")


def _settings_from_row(row: PadelMatchRow) -> MatchmakerSettings:
    raw = row.settings_json
    if isinstance(raw, str):
        raw = json.loads(raw)
    if raw is None:
        raw = {}
    return MatchmakerSettings.model_validate(raw)


async def require_match(user_id: UserId, match_id: PadelMatchId) -> PadelMatchRow:
    row = await sql_get_padel_match(match_id, user_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    return row


class ReclubPreviewBody(BaseModel):
    reclub_link: str


@router.post("/padel_matches/reclub_preview")
async def reclub_preview(body: ReclubPreviewBody) -> dict[str, Any]:
    # Copied approach from existing tournament players_reclub endpoint; kept isolated here.
    import aiohttp
    import html
    import re

    async with aiohttp.ClientSession() as session:
        async with session.get(
            body.reclub_link, headers={"User-Agent": "Mozilla/5.0"}, timeout=20
        ) as response:
            response.raise_for_status()
            page = await response.text()

    start = page.find("Dikonfirmasi <span>·")
    if start == -1:
        raise HTTPException(400, detail="Could not find confirmed participants section")
    end = page.find("Daftar tunggu", start)
    if end == -1:
        end = page.find("Diminta", start)
    if end == -1:
        end = len(page)
    chunk = page[start:end]
    participants = re.findall(
        r'<a href="/id/players/@[^"]+"[^>]*>.*?<p class="font-semibold[^>]*>(.*?)</p></a>',
        chunk,
        re.S,
    )
    names = [html.unescape(name).strip() for name in participants if name.strip()]
    return {"data": {"players": names}}


class PadelMatchGameOut(BaseModel):
    id: int
    round_id: int
    court_index: int
    court_name: str | None
    team1_player_ids: list[int]
    team2_player_ids: list[int]
    score1: int | None
    score2: int | None
    sets_json: list[list[int]] | None = None
    status: str


class PadelMatchRoundOut(BaseModel):
    id: int
    round_number: int
    status: str
    games: list[PadelMatchGameOut]


class FairnessOut(BaseModel):
    fairness_score: float
    partner_counts: dict[str, int]
    games_per_player: dict[int, int]


class FullPadelMatchOut(BaseModel):
    match: dict[str, Any]
    players: list[dict[str, Any]]
    rounds: list[PadelMatchRoundOut]
    leaderboard: list[dict[str, Any]]
    fairness: FairnessOut | None = None


class SuccessEnvelope(BaseModel):
    success: bool = True


def _serialize_match(row: PadelMatchRow) -> dict[str, Any]:
    settings = row.settings_json if isinstance(row.settings_json, dict) else {}
    return {
        "id": int(row.id),
        "created": row.created,
        "name": row.name,
        "match_type": row.match_type,
        "scoring_type": row.scoring_type,
        "points_per_match": row.points_per_match,
        "courts": row.courts,
        "start_time": row.start_time,
        "status": row.status,
        "settings": settings,
        "dashboard_public": bool(row.dashboard_public) if row.dashboard_public is not None else None,
        "dashboard_endpoint": row.dashboard_endpoint,
    }


async def _build_full_response(padel_match_id: PadelMatchId, user_id: UserId) -> FullPadelMatchOut:
    m = await require_match(user_id, padel_match_id)
    players_db = await sql_get_players(padel_match_id)
    rounds_db = await sql_get_rounds(padel_match_id)
    settings = _settings_from_row(m)
    sort_by: Literal["points", "wins"] = settings.sort_leaderboard_by

    rounds_out: list[PadelMatchRoundOut] = []
    all_games: list[Any] = []
    for r in rounds_db:
        games = await sql_get_games_for_round(r.id)
        all_games.extend(games)
        rounds_out.append(
            PadelMatchRoundOut(
                id=int(r.id),
                round_number=r.round_number,
                status=r.status,
                games=[
                    PadelMatchGameOut(
                        id=int(g.id),
                        round_id=int(g.round_id),
                        court_index=g.court_index,
                        court_name=g.court_name,
                        team1_player_ids=list(g.team1_player_ids),
                        team2_player_ids=list(g.team2_player_ids),
                        score1=g.score1,
                        score2=g.score2,
                        sets_json=g.sets_json,
                        status=g.status,
                    )
                    for g in games
                ],
            )
        )

    lb = compute_leaderboard(
        [(int(p.id), p.name) for p in players_db],
        all_games,
        sort_by=sort_by,
    )

    fairness = None
    engine_games: list[EngineGame] = []
    for g in all_games:
        engine_games.append(
            EngineGame(
                court_index=g.court_index,
                team1=list(g.team1_player_ids),
                team2=list(g.team2_player_ids),
            )
        )
    if engine_games:
        fr = build_fairness_report(engine_games)
        pc = {f"{a}-{b}": v for (a, b), v in fr.partner_counts.items()}
        fairness = FairnessOut(
            fairness_score=fr.fairness_score,
            partner_counts=pc,
            games_per_player=fr.games_per_player,
        )

    return FullPadelMatchOut(
        match=_serialize_match(m),
        players=[
            {
                "id": int(p.id),
                "name": p.name,
                "source": p.source,
                "order_index": p.order_index,
            }
            for p in players_db
        ],
        rounds=rounds_out,
        leaderboard=lb,
        fairness=fairness,
    )


@router.post("/padel_matches")
async def create_padel_match(
    body: PadelMatchCreateBody,
    user: UserPublic = Depends(user_authenticated),
) -> dict[str, Any]:
    tm = is_team_mode(body.match_type)
    need = min_players_for_courts(body.courts, tm)
    if len(body.players) < need:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough players for selected court count",
        )
    if tm and len(body.players) % 2 != 0:
        raise HTTPException(status_code=400, detail="Team modes require an even player count")

    async with database.transaction():
        dashboard_endpoint = secrets.token_urlsafe(10)
        mid = await sql_insert_padel_match(
            UserId(user.id),
            body,
            dashboard_endpoint=dashboard_endpoint,
            dashboard_public=True,
        )
        tuples = [
            (p.name, p.source.value, p.order_index)
            for p in sorted(body.players, key=lambda x: x.order_index)
        ]
        await sql_insert_players(mid, tuples)

    return {"data": {"id": int(mid), "dashboard_endpoint": dashboard_endpoint}}


@router.get("/padel_matches")
async def list_padel_matches(user: UserPublic = Depends(user_authenticated)) -> dict[str, Any]:
    rows = await sql_list_padel_matches(UserId(user.id))
    return {"data": [_serialize_match(r) for r in rows]}


@router.get("/padel_matches/{padel_match_id}")
async def get_padel_match(
    padel_match_id: PadelMatchId,
    user: UserPublic = Depends(user_authenticated),
) -> dict[str, Any]:
    full = await _build_full_response(padel_match_id, UserId(user.id))
    return {"data": full.model_dump(mode="json")}


@router.delete("/padel_matches/{padel_match_id}")
async def delete_padel_match(
    padel_match_id: PadelMatchId,
    user: UserPublic = Depends(user_authenticated),
) -> SuccessEnvelope:
    _ = await require_match(UserId(user.id), padel_match_id)
    await sql_delete_padel_match(padel_match_id, UserId(user.id))
    return SuccessEnvelope()


@router.get("/padel_matches/public/{dashboard_endpoint}")
async def get_padel_match_public(dashboard_endpoint: str) -> dict[str, Any]:
    m = await sql_get_padel_match_by_endpoint(dashboard_endpoint)
    if m is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    full = await _build_full_response(PadelMatchId(m.id), UserId(m.user_id))
    return {"data": full.model_dump(mode="json")}


@router.post("/padel_matches/{padel_match_id}/simulate")
async def simulate_padel_match(
    padel_match_id: PadelMatchId,
    body: PadelMatchSimulateBody | None = None,
    user: UserPublic = Depends(user_authenticated),
) -> dict[str, Any]:
    m = await require_match(UserId(user.id), padel_match_id)
    if m.status not in (PadelMatchStatus.DRAFT.value, PadelMatchStatus.PREVIEW.value):
        raise HTTPException(400, detail="Can only simulate draft/preview matches")

    settings = _settings_from_row(m)
    sim_body = body or PadelMatchSimulateBody()
    seed = (
        sim_body.seed
        if sim_body.seed is not None
        else (settings.simulation_seed or random.randint(1, 2**31))
    )
    players_db = await sql_get_players(padel_match_id)
    pids = [int(p.id) for p in players_db]
    tm = is_team_mode(m.match_type)
    units = build_units_from_players(pids, team_mode=tm)

    n_units = len(units)
    if sim_body.preview_rounds is not None:
        num_rounds = sim_body.preview_rounds
    elif settings.american_rounds_mode == "custom" and settings.custom_round_count:
        num_rounds = settings.custom_round_count
    else:
        num_rounds = estimate_rounds_americano(n_units, m.courts, settings.american_rounds_mode)

    if is_koth_family(m.match_type):
        num_rounds = 1

    try:
        schedule = generate_full_schedule(
            match_type=m.match_type,
            units=units,
            courts=m.courts,
            num_rounds=num_rounds,
            seed=seed,
        )
    except ValueError as e:
        raise HTTPException(400, detail=str(e)) from e

    async with database.transaction():
        await sql_delete_preview_rounds(padel_match_id)
        st = settings.model_dump()
        st["simulation_seed"] = seed
        await sql_update_settings_json(padel_match_id, st)
        for rn, round_games in enumerate(schedule, start=1):
            rid = await sql_insert_round(padel_match_id, rn, PadelMatchRoundStatus.PREVIEW.value)
            for g in round_games:
                await sql_insert_game(
                    rid,
                    g.court_index,
                    None,
                    g.team1,
                    g.team2,
                    PadelMatchGameStatus.PENDING.value,
                )
        await sql_update_match_status(padel_match_id, PadelMatchStatus.PREVIEW.value)

    full = await _build_full_response(padel_match_id, UserId(user.id))
    return {
        "data": {
            **full.model_dump(mode="json"),
            "meta": {
                "seed": seed,
                "estimated_rounds": num_rounds,
            },
        }
    }


@router.post("/padel_matches/{padel_match_id}/reshuffle")
async def reshuffle_padel_match(
    padel_match_id: PadelMatchId,
    body: PadelMatchSimulateBody | None = None,
    user: UserPublic = Depends(user_authenticated),
) -> dict[str, Any]:
    return await simulate_padel_match(padel_match_id, body, user)


@router.post("/padel_matches/{padel_match_id}/start")
async def start_padel_match(
    padel_match_id: PadelMatchId,
    user: UserPublic = Depends(user_authenticated),
) -> dict[str, Any]:
    m = await require_match(UserId(user.id), padel_match_id)
    if m.status != PadelMatchStatus.PREVIEW.value:
        raise HTTPException(400, detail="Match must be in preview to start")
    rounds = await sql_get_rounds(padel_match_id)
    if not rounds:
        raise HTTPException(400, detail="Simulate before starting")

    first = min(rounds, key=lambda r: r.round_number)
    async with database.transaction():
        await sql_update_match_status(padel_match_id, PadelMatchStatus.ACTIVE.value)
        for r in rounds:
            if r.id == first.id:
                await sql_update_round_status(r.id, PadelMatchRoundStatus.ACTIVE.value)
            else:
                await sql_update_round_status(r.id, PadelMatchRoundStatus.PREVIEW.value)

    full = await _build_full_response(padel_match_id, UserId(user.id))
    return {"data": full.model_dump(mode="json")}


@router.put("/padel_matches/{padel_match_id}/games/{game_id}")
async def patch_padel_game(
    padel_match_id: PadelMatchId,
    game_id: PadelMatchGameId,
    body: PadelMatchGamePatchBody,
    user: UserPublic = Depends(user_authenticated),
) -> dict[str, Any]:
    _ = await require_match(UserId(user.id), padel_match_id)
    g = await sql_get_game(game_id)
    if g is None:
        raise HTTPException(404, detail="Game not found")
    r = await sql_get_round_by_id(g.round_id)
    if r is None or r.padel_match_id != padel_match_id:
        raise HTTPException(404, detail="Game not found")

    if body.sets_json is not None:
        s1 = sum(x[0] for x in body.sets_json)
        s2 = sum(x[1] for x in body.sets_json)
        await sql_update_game_sets(
            game_id,
            s1,
            s2,
            body.sets_json,
            PadelMatchGameStatus.DONE.value,
        )
    elif body.score1 is not None and body.score2 is not None:
        await sql_update_game_scores(
            game_id,
            body.score1,
            body.score2,
            PadelMatchGameStatus.DONE.value,
        )
    if body.court_name is not None:
        await sql_update_game_court_name(game_id, body.court_name)

    full = await _build_full_response(padel_match_id, UserId(user.id))
    return {"data": full.model_dump(mode="json")}


@router.post("/padel_matches/{padel_match_id}/courts/{court_index}/rename")
async def rename_court_for_match(
    padel_match_id: PadelMatchId,
    court_index: int,
    body: PadelMatchGamePatchBody,
    user: UserPublic = Depends(user_authenticated),
) -> dict[str, Any]:
    _ = await require_match(UserId(user.id), padel_match_id)
    if body.court_name is None:
        raise HTTPException(status_code=400, detail="court_name is required")
    await sql_update_court_name_for_match(padel_match_id, court_index, body.court_name)
    full = await _build_full_response(padel_match_id, UserId(user.id))
    return {"data": full.model_dump(mode="json")}


@router.post("/padel_matches/{padel_match_id}/rounds/{round_id}/finish")
async def finish_round(
    padel_match_id: PadelMatchId,
    round_id: PadelMatchRoundId,
    user: UserPublic = Depends(user_authenticated),
) -> dict[str, Any]:
    m = await require_match(UserId(user.id), padel_match_id)
    rnd = await sql_get_round_by_id(round_id)
    if rnd is None or rnd.padel_match_id != padel_match_id:
        raise HTTPException(404, detail="Round not found")
    games = await sql_get_games_for_round(round_id)
    for g in games:
        if g.score1 is None or g.score2 is None:
            raise HTTPException(400, detail="All games in the round need scores")

    async with database.transaction():
        await sql_update_round_status(round_id, PadelMatchRoundStatus.DONE.value)
        all_r = await sql_get_rounds(padel_match_id)
        nxt = [r for r in all_r if r.round_number == rnd.round_number + 1]
        if nxt:
            await sql_update_round_status(nxt[0].id, PadelMatchRoundStatus.ACTIVE.value)
        elif is_koth_family(m.match_type) and m.status == PadelMatchStatus.ACTIVE.value:
            players_db = await sql_get_players(padel_match_id)
            all_g = await sql_get_all_games_for_match(padel_match_id)
            settings = _settings_from_row(m)
            seed = settings.simulation_seed or 42
            rng = random.Random(seed + rnd.round_number)
            tm = is_team_mode(m.match_type)
            pids = [int(p.id) for p in players_db]
            units = build_units_from_players(pids, team_mode=tm)
            stats = {pid: 0.0 for pid in pids}
            for g in all_g:
                if g.score1 is None or g.score2 is None:
                    continue
                if g.score1 > g.score2:
                    w, l = list(g.team1_player_ids), list(g.team2_player_ids)
                elif g.score2 > g.score1:
                    w, l = list(g.team2_player_ids), list(g.team1_player_ids)
                else:
                    continue
                for pid in w:
                    stats[pid] += 3
                for pid in l:
                    stats[pid] += 0
            unit_points: list[float] = []
            for u in units:
                unit_points.append(sum(stats[pid] for pid in u))
            new_games = generate_koth_round_from_points(units, m.courts, unit_points, rng)
            rid = await sql_insert_round(
                padel_match_id,
                rnd.round_number + 1,
                PadelMatchRoundStatus.ACTIVE.value,
            )
            for eg in new_games:
                await sql_insert_game(
                    rid,
                    eg.court_index,
                    None,
                    eg.team1,
                    eg.team2,
                    PadelMatchGameStatus.PENDING.value,
                )

    full = await _build_full_response(padel_match_id, UserId(user.id))
    return {"data": full.model_dump(mode="json")}


@router.post("/padel_matches/{padel_match_id}/finish")
async def finish_padel_match(
    padel_match_id: PadelMatchId,
    user: UserPublic = Depends(user_authenticated),
) -> SuccessEnvelope:
    m = await require_match(UserId(user.id), padel_match_id)
    if m.status != PadelMatchStatus.ACTIVE.value:
        raise HTTPException(400, detail="Match is not active")
    await sql_update_match_status(padel_match_id, PadelMatchStatus.COMPLETED.value)
    return SuccessEnvelope()
