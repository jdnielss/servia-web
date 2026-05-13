from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from bracket.models.db.padel_matchmaker import PadelMatchGameRow


@dataclass(slots=True)
class PlayerStat:
    player_id: int
    name: str
    games: int = 0
    wins: int = 0
    losses: int = 0
    ties: int = 0
    points_for: int = 0
    points_against: int = 0


def compute_leaderboard(
    players: list[tuple[int, str]],
    games: list[PadelMatchGameRow],
    *,
    sort_by: Literal["points", "wins"],
) -> list[dict[str, int | str]]:
    """Aggregate finished games with scores. Players identified by padel_match_players.id."""
    pmap = {pid: PlayerStat(player_id=pid, name=name) for pid, name in players}

    for g in games:
        if g.score1 is None or g.score2 is None:
            continue
        s1, s2 = g.score1, g.score2
        t1 = list(g.team1_player_ids)
        t2 = list(g.team2_player_ids)
        all_ids = t1 + t2
        for pid in all_ids:
            if pid not in pmap:
                continue
            pmap[pid].games += 1
            pmap[pid].points_for += s1 if pid in t1 else s2
            pmap[pid].points_against += s2 if pid in t1 else s1
        if s1 > s2:
            w_team, l_team = t1, t2
        elif s2 > s1:
            w_team, l_team = t2, t1
        else:
            for pid in all_ids:
                if pid in pmap:
                    pmap[pid].ties += 1
            continue
        for pid in w_team:
            if pid in pmap:
                pmap[pid].wins += 1
        for pid in l_team:
            if pid in pmap:
                pmap[pid].losses += 1

    rows = list(pmap.values())
    if sort_by == "points":
        rows.sort(
            key=lambda r: (r.points_for - r.points_against, r.points_for, -r.player_id),
            reverse=True,
        )
    else:
        rows.sort(key=lambda r: (r.wins, r.points_for - r.points_against, -r.player_id), reverse=True)

    out: list[dict[str, int | str]] = []
    for rank, r in enumerate(rows, start=1):
        diff = r.points_for - r.points_against
        out.append(
            {
                "p": rank,
                "player_id": r.player_id,
                "name": r.name,
                "g": r.games,
                "w": r.wins,
                "l": r.losses,
                "t": r.ties,
                "diff": diff,
                "plus_m": r.points_for,
                "wlt": f"{r.wins}-{r.losses}-{r.ties}",
            }
        )
    return out
