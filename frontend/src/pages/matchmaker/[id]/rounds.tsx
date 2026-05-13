import {
  Badge,
  Card,
  Divider,
  Grid,
  Group,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import SaveButton from '@components/buttons/save';
import { requestSucceeded } from '@services/adapter';
import {
  finishPadelMatch,
  getPadelMatch,
  patchPadelGame,
  renamePadelCourtForMatch,
} from '@services/padel_matchmaker';

import {
  clampPairAfterEditTeam1,
  clampPairAfterEditTeam2,
  labelForNormalFormat,
  normalizeNormalFormat,
  tennisLimits,
} from '../normal_format';

export default function MatchmakerRoundsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mid = Number(id);
  const [data, setData] = useState<any>(null);
  const [scoreModalOpened, setScoreModalOpened] = useState(false);
  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  const [modalScore1, setModalScore1] = useState<string>('0');
  const [modalScore2, setModalScore2] = useState<string>('0');
  const [courtModalOpened, setCourtModalOpened] = useState(false);
  const [editingCourtIndex, setEditingCourtIndex] = useState<number | null>(null);
  const [modalCourtName, setModalCourtName] = useState('');
  const [selectedRoundNumber, setSelectedRoundNumber] = useState<number | null>(null);

  const load = async () => {
    const res = await getPadelMatch(mid);
    if (requestSucceeded(res as any) && res?.data?.data) {
      setData(res.data.data);
    }
  };

  useEffect(() => {
    void load();
  }, [mid]);

  const activeRound = useMemo(() => {
    const rounds = data?.rounds ?? [];
    return rounds.find((r: any) => r.status === 'ACTIVE') ?? rounds[0];
  }, [data]);

  const currentEditingGame = useMemo(() => {
    if (editingGameId == null) return null;
    const rounds = data?.rounds ?? [];
    for (const r of rounds) {
      const found = (r.games ?? []).find((g: any) => g.id === editingGameId);
      if (found != null) return found;
    }
    return null;
  }, [editingGameId, data]);

  const roundBySelection = useMemo(() => {
    const rounds = (data?.rounds ?? []).slice().sort((a: any, b: any) => a.round_number - b.round_number);
    if (rounds.length === 0) return null;
    if (selectedRoundNumber == null) return activeRound ?? rounds[0];
    return rounds.find((r: any) => r.round_number === selectedRoundNumber) ?? activeRound ?? rounds[0];
  }, [data, selectedRoundNumber, activeRound]);

  const playersById = useMemo(() => {
    const m: Record<number, string> = {};
    for (const p of data?.players ?? []) {
      m[p.id] = p.name;
    }
    return m;
  }, [data]);

  const normalizedNormalFormat = useMemo(
    () => normalizeNormalFormat(data?.match?.settings?.normal_format),
    [data?.match?.settings?.normal_format]
  );
  const tennisLimitsResolved = useMemo(
    () => tennisLimits(normalizedNormalFormat),
    [normalizedNormalFormat]
  );

  const labelSide = (ids: number[]) =>
    ids.map((i) => playersById[i] ?? `#${i}`).join(' - ');

  const scoringType = data?.match?.scoring_type as 'POINT' | 'NORMAL';
  const matchType = String(data?.match?.match_type ?? '');
  const isAmericanoFamily = ['AMERICANO', 'TEAM_AMERICANO', 'MIX_AMERICANO'].includes(matchType);
  const pointsPerMatch = Number(data?.match?.points_per_match ?? 21);
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const normalizePointScores = (s1: number, s2: number) => {
    let a = clamp(Number(s1) || 0, 0, pointsPerMatch);
    let b = clamp(Number(s2) || 0, 0, pointsPerMatch);
    // Prevent tie at the winning score; follow "winner hits target, loser max target-1".
    if (a >= pointsPerMatch && b >= pointsPerMatch) {
      if (a >= b) b = pointsPerMatch - 1;
      else a = pointsPerMatch - 1;
    }
    if (a >= pointsPerMatch) b = Math.min(b, pointsPerMatch - 1);
    if (b >= pointsPerMatch) a = Math.min(a, pointsPerMatch - 1);
    return { s1: a, s2: b };
  };

  const availableScores = (otherScore: number) => {
    const other = clamp(Number(otherScore) || 0, 0, pointsPerMatch);
    const max =
      other >= pointsPerMatch ? pointsPerMatch - 1 : pointsPerMatch;
    return Array.from({ length: max + 1 }, (_, i) => ({
      value: String(i),
      label: String(i),
    }));
  };

  const adjustedOpponentScore = (
    selfScore: number,
    _opponentCurrent: number,
    selfIsTeam1: boolean
  ) => {
    const self = clamp(Number(selfScore) || 0, 0, pointsPerMatch);
    // Auto-select opposite side from total points budget (target - selected score).
    // This makes the opposite score visibly update immediately.
    const computedOpp = clamp(pointsPerMatch - self, 0, pointsPerMatch);
    const maxOpp = self >= pointsPerMatch ? pointsPerMatch - 1 : pointsPerMatch;
    let opponent = computedOpp;
    if (opponent > maxOpp) {
      opponent = maxOpp;
    }
    if (selfIsTeam1) {
      const { s1, s2 } = normalizePointScores(self, opponent);
      return { s1, s2 };
    }
    const { s1, s2 } = normalizePointScores(opponent, self);
    return { s1, s2 };
  };

  const openPointScoreModal = (game: any) => {
    setEditingGameId(game.id);
    setModalScore1(String(game.score1 ?? 0));
    setModalScore2(String(game.score2 ?? 0));
    setScoreModalOpened(true);
  };

  const savePointScoreModal = async () => {
    if (editingGameId == null) return;
    const { s1, s2 } = normalizePointScores(Number(modalScore1), Number(modalScore2));
    await patchPadelGame(mid, editingGameId, { score1: s1, score2: s2 });
    setScoreModalOpened(false);
    setEditingGameId(null);
    await load();
  };

  const openCourtModal = (courtIndex: number, courtName: string | null) => {
    setEditingCourtIndex(courtIndex);
    setModalCourtName((courtName ?? `Court ${courtIndex + 1}`).trim());
    setCourtModalOpened(true);
  };

  const saveCourtName = async () => {
    if (editingCourtIndex == null) return;
    const name = modalCourtName.trim();
    if (!name) return;
    await renamePadelCourtForMatch(mid, editingCourtIndex, name);
    setCourtModalOpened(false);
    setEditingCourtIndex(null);
    await load();
  };

  if (!data) return <Text>Loading…</Text>;

  const displayRound = roundBySelection;
  const allRoundsSorted = (data?.rounds ?? []).slice().sort((a: any, b: any) => a.round_number - b.round_number);

  return (
    <Stack>
      <Title order={3}>
        Round {displayRound?.round_number ?? '—'}{' '}
        <Text span size="sm" c="dimmed">
          ({displayRound?.status})
        </Text>
      </Title>
      {!displayRound && <Text>No rounds yet. Run simulation first.</Text>}

      {isAmericanoFamily && allRoundsSorted.length > 0 && (
        <Paper withBorder p="sm" radius="md">
          <Text size="sm" fw={700} mb="xs">
            Rounds
          </Text>
          <ScrollArea>
            <Group wrap="nowrap" gap="xs">
              {allRoundsSorted.map((r: any) => {
                const isSelected = (displayRound?.round_number ?? 0) === r.round_number;
                return (
                  <Card
                    key={r.id}
                    withBorder
                    p="xs"
                    radius="sm"
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? 'var(--mantine-color-brand-0)' : undefined,
                      borderColor: isSelected ? 'var(--mantine-color-brand-6)' : undefined,
                      minWidth: 72,
                      flexShrink: 0,
                    }}
                    onClick={() => setSelectedRoundNumber(r.round_number)}
                  >
                    <Text ta="center" fw={700}>
                      {r.round_number}
                    </Text>
                    <Text ta="center" size="xs" c="dimmed">
                      {r.status}
                    </Text>
                  </Card>
                );
              })}
            </Group>
          </ScrollArea>
        </Paper>
      )}

      {displayRound?.games.map((g: any) => (
        <Paper
          key={g.id}
          withBorder
          p="md"
          radius="md"
          style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8fbfa 100%)' }}
        >
          <Stack gap="sm">
            <Group justify="space-between" align="center" wrap="nowrap">
              <Group gap="xs" style={{ flex: 1 }} wrap="wrap">
                <Badge
                  variant="light"
                  color="teal"
                  radius="sm"
                  styles={{
                    root: {
                      paddingInline: 12,
                      paddingBlock: 8,
                      textTransform: 'none',
                      fontSize: '1rem',
                      fontWeight: 700,
                    },
                  }}
                >
                  {labelSide(g.team1_player_ids)}
                </Badge>
                <Text fw={700} c="dimmed" size="sm">
                  vs
                </Text>
                <Badge
                  variant="light"
                  color="blue"
                  radius="sm"
                  styles={{
                    root: {
                      paddingInline: 12,
                      paddingBlock: 8,
                      textTransform: 'none',
                      fontSize: '1rem',
                      fontWeight: 700,
                    },
                  }}
                >
                  {labelSide(g.team2_player_ids)}
                </Badge>
              </Group>
              <Badge
                color="brand"
                variant="light"
                style={{ cursor: 'pointer', flexShrink: 0 }}
                onClick={() => openCourtModal(g.court_index, g.court_name)}
              >
                {g.court_name?.trim() || `Court ${g.court_index + 1}`}
              </Badge>
            </Group>
            {scoringType === 'NORMAL' ? (
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  Tennis scoring (sets). Fill in the sets used; total games are computed automatically.
                </Text>
                <Badge variant="outline" color="blue" w="fit-content">
                  Format: {labelForNormalFormat(normalizedNormalFormat)}
                </Badge>
                {tennisLimitsResolved.mode === 'total_of' && (
                  <Text size="xs" c="dimmed">
                    Combined games per set (team 1 + team 2) cannot exceed {tennisLimitsResolved.cap}.
                  </Text>
                )}
                {[0, 1, 2].map((setIdx) => {
                  const current = (g.sets_json ?? [])[setIdx] ?? [0, 0];
                  const perTeamMax = tennisLimitsResolved.cap;
                  return (
                    <Card key={setIdx} withBorder radius="md" p="sm">
                      <Group grow align="flex-end">
                      <NumberInput
                        label={`Set ${setIdx + 1} (team 1)`}
                        min={0}
                        max={perTeamMax}
                        value={current[0] ?? 0}
                        onChange={async (v) => {
                          const sets = Array.isArray(g.sets_json) ? [...g.sets_json] : [];
                          while (sets.length < 3) sets.push([0, 0]);
                          const prevOther = Number(sets[setIdx]?.[1] ?? 0);
                          const [a, b] = clampPairAfterEditTeam1(
                            Number(v) || 0,
                            prevOther,
                            tennisLimitsResolved
                          );
                          sets[setIdx] = [a, b];
                          const trimmed = [...sets].reverse().reduce<number[][]>((acc, s) => {
                            if (acc.length === 0 && s[0] === 0 && s[1] === 0) return acc;
                            acc.push(s);
                            return acc;
                          }, []);
                          const finalSets = trimmed.reverse();
                          await patchPadelGame(mid, g.id, { sets_json: finalSets.length ? finalSets : [[0, 0]] });
                          await load();
                        }}
                      />
                      <NumberInput
                        label={`Set ${setIdx + 1} (team 2)`}
                        min={0}
                        max={perTeamMax}
                        value={current[1] ?? 0}
                        onChange={async (v) => {
                          const sets = Array.isArray(g.sets_json) ? [...g.sets_json] : [];
                          while (sets.length < 3) sets.push([0, 0]);
                          const prevOther = Number(sets[setIdx]?.[0] ?? 0);
                          const [a, b] = clampPairAfterEditTeam2(
                            prevOther,
                            Number(v) || 0,
                            tennisLimitsResolved
                          );
                          sets[setIdx] = [a, b];
                          const trimmed = [...sets].reverse().reduce<number[][]>((acc, s) => {
                            if (acc.length === 0 && s[0] === 0 && s[1] === 0) return acc;
                            acc.push(s);
                            return acc;
                          }, []);
                          const finalSets = trimmed.reverse();
                          await patchPadelGame(mid, g.id, { sets_json: finalSets.length ? finalSets : [[0, 0]] });
                          await load();
                        }}
                      />
                      </Group>
                    </Card>
                  );
                })}
                <Divider />
                <Grid>
                  <Grid.Col span={6}>
                    <NumberInput label="Total games (team 1)" value={g.score1 ?? 0} disabled />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <NumberInput label="Total games (team 2)" value={g.score2 ?? 0} disabled />
                  </Grid.Col>
                </Grid>
              </Stack>
            ) : (
              <Grid align="stretch">
                <Grid.Col span={6}>
                  <Card
                    withBorder
                    radius="md"
                    p="lg"
                    bg="brand.0"
                    h="100%"
                    style={{ cursor: 'pointer' }}
                    onClick={() => openPointScoreModal(g)}
                  >
                    <Stack align="center" gap="xs">
                      <Text fw={700}>Team 1</Text>
                      <Text fz={42} fw={800} lh={1}>
                        {g.score1 ?? 0}
                      </Text>
                      <Badge variant="light" color="brand">
                        Click to edit
                      </Badge>
                    </Stack>
                  </Card>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Card
                    withBorder
                    radius="md"
                    p="lg"
                    bg="blue.0"
                    h="100%"
                    style={{ cursor: 'pointer' }}
                    onClick={() => openPointScoreModal(g)}
                  >
                    <Stack align="center" gap="xs">
                      <Text fw={700}>Team 2</Text>
                      <Text fz={42} fw={800} lh={1}>
                        {g.score2 ?? 0}
                      </Text>
                      <Badge variant="light" color="blue">
                        Click to edit
                      </Badge>
                    </Stack>
                  </Card>
                </Grid.Col>
                <Grid.Col span={12}>
                  <Text size="xs" c="dimmed">
                    Point rule: target score is {pointsPerMatch}. If one team reaches target, opponent is capped at {pointsPerMatch - 1}.
                  </Text>
                </Grid.Col>
              </Grid>
            )}
          </Stack>
        </Paper>
      ))}
      {String(data?.match?.status ?? '') === 'ACTIVE' && (
        <SaveButton
          title="Finish Game"
          mx={0}
          color="red"
          onClick={async () => {
            if (!window.confirm('Finish this game session? This will finalize the matchmaker.')) return;
            const res = await finishPadelMatch(mid);
            if (requestSucceeded(res as any)) {
              await load();
              navigate(`/matchmaker/${mid}/leaderboard`);
            }
          }}
        />
      )}
      <Modal
        opened={scoreModalOpened}
        onClose={() => setScoreModalOpened(false)}
        title="Select available score"
      >
        <Stack>
          <Stack gap={6}>
            <Text fw={600} size="sm">
              {currentEditingGame != null
                ? labelSide(currentEditingGame.team1_player_ids)
                : 'Team 1'}{' '}
              score
            </Text>
            <Group gap="xs" wrap="wrap">
              {availableScores(Number(modalScore2)).map((opt) => {
                const selected = modalScore1 === opt.value;
                return (
                  <Card
                    key={`t1-${opt.value}`}
                    withBorder
                    p="xs"
                    radius="sm"
                    style={{
                      cursor: 'pointer',
                      minWidth: 42,
                      textAlign: 'center',
                      background: selected ? 'var(--mantine-color-brand-0)' : undefined,
                      borderColor: selected ? 'var(--mantine-color-brand-6)' : undefined,
                    }}
                    onClick={() => {
                      const { s1, s2 } = adjustedOpponentScore(
                        Number(opt.value),
                        Number(modalScore2),
                        true
                      );
                      setModalScore1(String(s1));
                      setModalScore2(String(s2));
                    }}
                  >
                    <Text fw={700}>{opt.value}</Text>
                  </Card>
                );
              })}
            </Group>
          </Stack>
          <Stack gap={6}>
            <Text fw={600} size="sm">
              {currentEditingGame != null
                ? labelSide(currentEditingGame.team2_player_ids)
                : 'Team 2'}{' '}
              score
            </Text>
            <Group gap="xs" wrap="wrap">
              {availableScores(Number(modalScore1)).map((opt) => {
                const selected = modalScore2 === opt.value;
                return (
                  <Card
                    key={`t2-${opt.value}`}
                    withBorder
                    p="xs"
                    radius="sm"
                    style={{
                      cursor: 'pointer',
                      minWidth: 42,
                      textAlign: 'center',
                      background: selected ? 'var(--mantine-color-blue-0)' : undefined,
                      borderColor: selected ? 'var(--mantine-color-blue-6)' : undefined,
                    }}
                    onClick={() => {
                      const { s1, s2 } = adjustedOpponentScore(
                        Number(opt.value),
                        Number(modalScore1),
                        false
                      );
                      setModalScore1(String(s1));
                      setModalScore2(String(s2));
                    }}
                  >
                    <Text fw={700}>{opt.value}</Text>
                  </Card>
                );
              })}
            </Group>
          </Stack>
          <SaveButton title="Apply score" mx={0} fullWidth onClick={() => void savePointScoreModal()} />
        </Stack>
      </Modal>
      <Modal
        opened={courtModalOpened}
        onClose={() => setCourtModalOpened(false)}
        title="Edit court name"
      >
        <Stack>
          <TextInput
            label="Court name"
            value={modalCourtName}
            onChange={(e) => setModalCourtName(e.currentTarget.value)}
            placeholder="Enter court name"
          />
          <Text size="xs" c="dimmed">
            Saving updates this court name across all rounds in this matchmaker session.
          </Text>
          <SaveButton title="Save" mx={0} fullWidth onClick={() => void saveCourtName()} />
        </Stack>
      </Modal>
    </Stack>
  );
}
