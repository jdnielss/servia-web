import { createAxios, handleRequestError } from './adapter';

export async function createPlayer(tournament_id: number, name: string, active: boolean) {
  return createAxios()
    .post(`tournaments/${tournament_id}/players`, { name, active })
    .catch((response: any) => handleRequestError(response));
}

export async function createMultiplePlayers(tournament_id: number, names: string, active: boolean) {
  return createAxios()
    .post(`tournaments/${tournament_id}/players_multi`, { names, active })
    .catch((response: any) => handleRequestError(response));
}

export async function createPlayersFromReclub(
  tournament_id: number,
  reclub_link: string,
  active: boolean = true
) {
  return createAxios()
    .post(`tournaments/${tournament_id}/players_reclub`, { reclub_link, active })
    .catch((response: any) => handleRequestError(response));
}

export async function deletePlayer(tournament_id: number, player_id: number) {
  return createAxios()
    .delete(`tournaments/${tournament_id}/players/${player_id}`)
    .catch((response: any) => handleRequestError(response));
}

export async function updatePlayer(
  tournament_id: number,
  player_id: number,
  name: string,
  active: boolean,
  team_id: string | null
) {
  return createAxios()
    .put(`tournaments/${tournament_id}/players/${player_id}`, {
      name,
      active,
      team_id,
    })
    .catch((response: any) => handleRequestError(response));
}
