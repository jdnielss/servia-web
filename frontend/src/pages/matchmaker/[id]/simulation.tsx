import {
  Accordion,
  Anchor,
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Paper,
  ScrollArea,
  Slider,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconPlayerPlayFilled, IconRefresh } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { requestSucceeded } from '@services/adapter';
import { getPadelMatch, reshufflePadelMatch, startPadelMatch } from '@services/padel_matchmaker';
import classes from './simulation.module.css';

export default function MatchmakerSimulationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mid = Number(id);
  const [data, setData] = useState<any>(null);

  const load = async () => {
    const res = await getPadelMatch(mid);
    if (requestSucceeded(res as any) && res?.data?.data) {
      setData(res.data.data);
    }
  };

  useEffect(() => {
    void load();
  }, [mid]);

  const fairness = data?.fairness;
  const rounds = data?.rounds ?? [];
  const settings = data?.match?.settings ?? {};
  const dashboardEndpoint = data?.match?.dashboard_endpoint;
  const [previewRound, setPreviewRound] = useState(1);

  const playersById = useMemo(() => {
    const m: Record<number, string> = {};
    for (const p of data?.players ?? []) {
      m[p.id] = p.name;
    }
    return m;
  }, [data]);

  const labelPlayer = (idStr: string) => {
    const id = Number(idStr);
    return playersById[id] ?? idStr;
  };
  const labelTeam = (ids: number[]) =>
    ids.map((i: number) => playersById[i] ?? `#${i}`).join(' - ');

  const maxRound = rounds.length || 1;
  const boundedPreviewRound = Math.min(previewRound, maxRound);

  const perRoundStats = useMemo(() => {
    if (!rounds.length) return [];

    const stats: Array<{
      round: number;
      gamesPerPlayer: Record<number, number>;
      minGames: number;
      maxGames: number;
      spread: number;
      equal: boolean;
    }> = [];

    const cumulative: Record<number, number> = {};
    for (const p of data?.players ?? []) cumulative[p.id] = 0;

    for (const r of rounds) {
      for (const g of r.games ?? []) {
        for (const pid of [...(g.team1_player_ids ?? []), ...(g.team2_player_ids ?? [])]) {
          cumulative[pid] = (cumulative[pid] ?? 0) + 1;
        }
      }
      const values = Object.values(cumulative);
      const minGames = values.length ? Math.min(...values) : 0;
      const maxGames = values.length ? Math.max(...values) : 0;
      stats.push({
        round: r.round_number,
        gamesPerPlayer: { ...cumulative },
        minGames,
        maxGames,
        spread: maxGames - minGames,
        equal: minGames === maxGames,
      });
    }
    return stats;
  }, [rounds, data]);

  const selectedRoundData =
    perRoundStats.find((x) => x.round === boundedPreviewRound) ?? perRoundStats[perRoundStats.length - 1];
  const firstEqualRound = perRoundStats.find((x) => x.equal)?.round ?? null;
  const partnerCountsByPreviewRound = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rounds.filter((x: any) => x.round_number <= boundedPreviewRound)) {
      for (const g of r.games ?? []) {
        for (const side of [g.team1_player_ids ?? [], g.team2_player_ids ?? []]) {
          if (side.length < 2) continue;
          const [a, b] = [...side].sort((x: number, y: number) => x - y);
          const key = `${a}-${b}`;
          counts[key] = (counts[key] ?? 0) + 1;
        }
      }
    }
    return counts;
  }, [rounds, boundedPreviewRound]);

  const partnerEntries = Object.entries(partnerCountsByPreviewRound);
  const maxPartnerCount =
    partnerEntries.length > 0 ? Math.max(...partnerEntries.map(([, v]) => Number(v))) : 0;

  return (
    <Stack>
      <Title order={3}>Simulation</Title>
      <Paper withBorder p="md">
        <Stack gap="xs">
          <Grid align="center">
            <Grid.Col span={{ base: 12, sm: 5 }}>
              <Text fw={600}>Preview round</Text>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 7 }}>
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Button
                    fullWidth
                    variant="light"
                    color="brand"
                    leftSection={<IconRefresh size={16} />}
                    className={classes.actionButton}
                    onClick={async () => {
                      const res = await reshufflePadelMatch(mid);
                      if (requestSucceeded(res as any)) await load();
                    }}
                  >
                    Reshuffle
                  </Button>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Button
                    fullWidth
                    color="brand"
                    leftSection={<IconPlayerPlayFilled size={16} />}
                    className={classes.actionButtonPrimary}
                    onClick={async () => {
                      const res = await startPadelMatch(mid);
                      if (requestSucceeded(res as any)) {
                        navigate(`/matchmaker/${mid}/rounds`);
                      }
                    }}
                  >
                    Play
                  </Button>
                </Grid.Col>
              </Grid>
            </Grid.Col>
          </Grid>
          <Slider
            min={1}
            max={maxRound}
            step={1}
            marks={[
              { value: 1, label: '1' },
              { value: maxRound, label: `${maxRound}` },
            ]}
            value={boundedPreviewRound}
            onChange={setPreviewRound}
            disabled={rounds.length === 0}
          />
          <Text size="sm">
            Showing simulation up to <strong>round {boundedPreviewRound}</strong> of {maxRound}.
          </Text>
          {selectedRoundData && (
            <Text size="sm" c="dimmed">
              Match distribution at round {selectedRoundData.round}: min {selectedRoundData.minGames}, max{' '}
              {selectedRoundData.maxGames}, spread {selectedRoundData.spread}.
            </Text>
          )}
          <Text size="sm">
            {firstEqualRound != null
              ? `Minimum round where all players have equal match count: round ${firstEqualRound}.`
              : 'No round in this simulation produces equal match count for all players yet.'}
          </Text>
        </Stack>
      </Paper>
      {dashboardEndpoint && (
        <Paper withBorder p="md">
          <Text fw={600}>Public dashboard link</Text>
          <Anchor href={`/matchmaker/public/${dashboardEndpoint}`} target="_blank">
            /matchmaker/public/{dashboardEndpoint}
          </Anchor>
          <Text size="xs" c="dimmed">
            Accessible without login (leaderboard + schedule).
          </Text>
        </Paper>
      )}
      {fairness && (
        <Grid>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card withBorder radius="md" padding="lg" bg="brand.0">
              <Text fw={700} c="brand.8">
                Fairness Score
              </Text>
              <Text fz={30} fw={800} c="brand.7" lh={1.1} mt={4}>
                {fairness.fairness_score.toFixed(4)}
              </Text>
              <Text size="xs" c="dimmed" mt="xs">
                Lower values mean partner combinations are more balanced.
              </Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Card withBorder radius="md" padding="lg">
              <Text fw={700} mb="xs">
                Games per Player
              </Text>
              <ScrollArea h={220}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Player</Table.Th>
                      <Table.Th>Games</Table.Th>
                      <Table.Th>Load</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {Object.entries(selectedRoundData?.gamesPerPlayer ?? fairness.games_per_player).map(
                      ([pid, n]) => {
                        const games = Number(n);
                        const min = selectedRoundData?.minGames ?? games;
                        const max = selectedRoundData?.maxGames ?? games;
                        const color = games === max ? 'teal' : games === min ? 'gray' : 'blue';
                        return (
                          <Table.Tr key={pid}>
                            <Table.Td>{labelPlayer(pid)}</Table.Td>
                            <Table.Td fw={700}>{games}</Table.Td>
                            <Table.Td>
                              <Badge color={color} variant="light">
                                {games === max ? 'High' : games === min ? 'Low' : 'Mid'}
                              </Badge>
                            </Table.Td>
                          </Table.Tr>
                        );
                      }
                    )}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Card>
          </Grid.Col>
        </Grid>
      )}
      {fairness && partnerEntries.length > 0 && (
        <Paper withBorder p="md" radius="md" style={{ background: 'linear-gradient(135deg, #f8fffc 0%, #eef8f4 100%)' }}>
          <Text fw={700} mb={4}>
            Partner Pair Counts
          </Text>
          <Text size="xs" c="dimmed" mb="sm">
            Color intensity indicates how often a pair appears together (up to round {boundedPreviewRound}).
          </Text>
          <Divider mb="sm" />
          <ScrollArea h={260}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Pair (players)</Table.Th>
                  <Table.Th>Times together</Table.Th>
                  <Table.Th>Intensity</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {partnerEntries
                  .sort((a, b) => Number(b[1]) - Number(a[1]))
                  .map(([k, v]) => {
                  const [a, b] = k.split('-');
                  const label =
                    [labelPlayer(a), labelPlayer(b)]
                      .map((x) => x.trim())
                      .join(' + ');
                  const count = Number(v);
                  const ratio = maxPartnerCount > 0 ? count / maxPartnerCount : 0;
                  const badgeColor = ratio >= 0.75 ? 'red' : ratio >= 0.5 ? 'orange' : ratio >= 0.25 ? 'yellow' : 'green';
                  return (
                    <Table.Tr key={k}>
                      <Table.Td fw={600}>{label}</Table.Td>
                      <Table.Td>
                        <Badge color={badgeColor} variant="filled">
                          {String(v)}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={badgeColor} variant="light">
                          {ratio >= 0.75 ? 'Very High' : ratio >= 0.5 ? 'High' : ratio >= 0.25 ? 'Medium' : 'Low'}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>
      )}

      <Paper withBorder p="md">
        <Title order={5}>Preview rounds</Title>
        <Accordion
          variant="separated"
          classNames={{
            item: classes.previewAccordionItem,
            control: classes.previewAccordionControl,
            panel: classes.previewAccordionPanel,
          }}
        >
          {rounds
            .filter((r: any) => r.round_number <= boundedPreviewRound)
            .map((r: any) => (
            <Accordion.Item key={r.id} value={`${r.round_number}`}>
              <Accordion.Control>Round {r.round_number}</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">
                  {r.games.map((g: any) => (
                    <Card key={g.id} withBorder radius="md" p="sm" className={classes.previewMatchCard}>
                      <Group justify="space-between" align="flex-start" wrap="nowrap">
                        <Group gap="xs" style={{ flex: 1 }} wrap="wrap">
                          <Badge variant="light" color="teal" radius="sm" className={classes.previewTeamBadge}>
                            {labelTeam(g.team1_player_ids ?? [])}
                          </Badge>
                          <Text size="xs" c="dimmed" fw={700} className={classes.previewVs}>
                            VS
                          </Text>
                          <Badge variant="light" color="blue" radius="sm" className={classes.previewTeamBadge}>
                            {labelTeam(g.team2_player_ids ?? [])}
                          </Badge>
                        </Group>
                        <Badge variant="outline" color="brand" radius="sm" className={classes.previewCourtBadge}>
                          {(g.court_name ?? '').trim() || `Court ${g.court_index + 1}`}
                        </Badge>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Paper>

      {settings?.simulation_seed != null && (
        <Text size="xs" c="dimmed">
          Last simulation seed: {String(settings.simulation_seed)}
        </Text>
      )}
    </Stack>
  );
}
