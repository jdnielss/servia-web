import axios from 'axios';

import { createAxios, getBaseApiUrl, handleRequestError } from './adapter';

export type MatchmakerMatchType =
  | 'AMERICANO'
  | 'TEAM_AMERICANO'
  | 'MIX_AMERICANO'
  | 'MEXICANO'
  | 'TEAM_MEXICANO'
  | 'MIXICANO'
  | 'KOTH'
  | 'TEAM_KOTH';

export interface MatchmakerPlayerInput {
  name: string;
  source: 'MANUAL' | 'PLAYER';
  order_index: number;
}

export interface MatchmakerSettingsPayload {
  sort_leaderboard_by?: 'points' | 'wins';
  initial_player_order?: 'registration' | 'random';
  hide_public_leaderboard?: boolean;
  american_rounds_mode?: 'full' | 'custom';
  custom_round_count?: number | null;
  simulation_seed?: number | null;
  normal_format?:
    | 'FIRST_TO_3'
    | 'FIRST_TO_4'
    | 'FIRST_TO_5'
    | 'FIRST_TO_6'
    | 'FIRST_TO_7'
    | 'TOTAL_OF_3'
    | 'TOTAL_OF_4'
    | 'TOTAL_OF_5'
    | 'TOTAL_OF_6'
    | 'TOTAL_OF_7'
    | 'BEST_OF_3'
    | 'TOTAL_GAMES_4'
    | 'TOTAL_GAMES_6';
}

export async function createPadelMatch(payload: {
  name: string;
  match_type: MatchmakerMatchType;
  scoring_type: 'POINT' | 'NORMAL';
  points_per_match: number;
  courts: number;
  start_time: string;
  players: MatchmakerPlayerInput[];
  settings?: MatchmakerSettingsPayload;
}) {
  return createAxios()
    .post('padel_matches', payload)
    .catch((e: unknown) => handleRequestError(e as any));
}

export async function listPadelMatches() {
  return createAxios().get('padel_matches').catch((e: unknown) => handleRequestError(e as any));
}

export async function deletePadelMatch(id: number) {
  return createAxios().delete(`padel_matches/${id}`).catch((e: unknown) => handleRequestError(e as any));
}

export async function getPadelMatch(id: number) {
  return createAxios().get(`padel_matches/${id}`).catch((e: unknown) => handleRequestError(e as any));
}

export async function getPadelMatchPublic(dashboard_endpoint: string) {
  return axios
    .get(`${getBaseApiUrl()}/padel_matches/public/${dashboard_endpoint}`, {
      headers: { Accept: 'application/json' },
    })
    .catch((e: unknown) => handleRequestError(e as any));
}

export async function simulatePadelMatch(id: number, body?: { seed?: number; preview_rounds?: number }) {
  return createAxios()
    .post(`padel_matches/${id}/simulate`, body ?? {})
    .catch((e: unknown) => handleRequestError(e as any));
}

export async function reshufflePadelMatch(id: number, body?: { seed?: number; preview_rounds?: number }) {
  return createAxios()
    .post(`padel_matches/${id}/reshuffle`, body ?? {})
    .catch((e: unknown) => handleRequestError(e as any));
}

export async function startPadelMatch(id: number) {
  return createAxios()
    .post(`padel_matches/${id}/start`)
    .catch((e: unknown) => handleRequestError(e as any));
}

export async function patchPadelGame(
  matchId: number,
  gameId: number,
  body: { score1?: number; score2?: number; court_name?: string; sets_json?: number[][] }
) {
  return createAxios()
    .put(`padel_matches/${matchId}/games/${gameId}`, body)
    .catch((e: unknown) => handleRequestError(e as any));
}

export async function renamePadelCourtForMatch(
  matchId: number,
  courtIndex: number,
  courtName: string
) {
  return createAxios()
    .post(`padel_matches/${matchId}/courts/${courtIndex}/rename`, { court_name: courtName })
    .catch((e: unknown) => handleRequestError(e as any));
}

export async function finishRound(matchId: number, roundId: number) {
  return createAxios()
    .post(`padel_matches/${matchId}/rounds/${roundId}/finish`)
    .catch((e: unknown) => handleRequestError(e as any));
}

export async function finishPadelMatch(matchId: number) {
  return createAxios()
    .post(`padel_matches/${matchId}/finish`)
    .catch((e: unknown) => handleRequestError(e as any));
}

export async function reclubPreview(reclub_link: string) {
  return createAxios()
    .post(`padel_matches/reclub_preview`, { reclub_link })
    .catch((e: unknown) => handleRequestError(e as any));
}
