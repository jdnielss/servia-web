import { Paper, Stack, Table, Tabs, Text, Title } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';

import Layout from '../_layout';
import { requestSucceeded } from '@services/adapter';
import { getPadelMatchPublic } from '@services/padel_matchmaker';

export default function MatchmakerPublicPage() {
  const { endpoint } = useParams();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<string | null>('schedule');

  useEffect(() => {
    if (!endpoint) return;
    void (async () => {
      const res = await getPadelMatchPublic(endpoint);
      if (requestSucceeded(res as any) && res?.data?.data) {
        setData(res.data.data);
      }
    })();
  }, [endpoint]);

  const rounds = data?.rounds ?? [];
  const leaderboard = data?.leaderboard ?? [];

  const playersById = useMemo(() => {
    const m: Record<number, string> = {};
    for (const p of data?.players ?? []) m[p.id] = p.name;
    return m;
  }, [data]);

  const labelSide = (ids: number[]) => ids.map((i) => playersById[i] ?? `#${i}`).join(' + ');

  return (
    <Layout breadcrumbs={<span>Match Dashboard</span>}>
      <Stack>
        <Title order={2}>{data?.match?.name ?? 'Match'}</Title>
        <Text size="sm" c="dimmed">
          Public dashboard · {data?.match?.match_type} · {data?.match?.scoring_type}
        </Text>

        <Tabs value={tab} onChange={setTab}>
          <Tabs.List grow>
            <Tabs.Tab value="schedule">Schedule</Tabs.Tab>
            <Tabs.Tab value="leaderboard">Leaderboard</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="schedule" pt="md">
            <Stack>
              {rounds.map((r: any) => (
                <Paper key={r.id} withBorder p="md">
                  <Title order={5}>Round {r.round_number}</Title>
                  <Stack gap={6} mt="sm">
                    {r.games.map((g: any) => (
                      <Text key={g.id} size="sm">
                        Court {g.court_index + 1}: {labelSide(g.team1_player_ids)} vs{' '}
                        {labelSide(g.team2_player_ids)}{' '}
                        {g.score1 != null && g.score2 != null ? `(${g.score1}-${g.score2})` : ''}
                      </Text>
                    ))}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="leaderboard" pt="md">
            <Paper withBorder p="md">
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>P</Table.Th>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>G</Table.Th>
                    <Table.Th>W-L-T</Table.Th>
                    <Table.Th>DIFF</Table.Th>
                    <Table.Th>+M</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {leaderboard.map((r: any) => (
                    <Table.Tr key={r.player_id}>
                      <Table.Td>{r.p}</Table.Td>
                      <Table.Td>{r.name}</Table.Td>
                      <Table.Td>{r.g}</Table.Td>
                      <Table.Td>{r.wlt}</Table.Td>
                      <Table.Td>{r.diff}</Table.Td>
                      <Table.Td>{r.plus_m}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Layout>
  );
}

