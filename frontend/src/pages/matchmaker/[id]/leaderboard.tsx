import { Badge, Card, Group, Paper, ScrollArea, Stack, Table, Text, ThemeIcon, Title } from '@mantine/core';
import { IconArrowUpRight, IconCrown, IconSparkles, IconTrophy } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';

import { requestSucceeded } from '@services/adapter';
import { getPadelMatch } from '@services/padel_matchmaker';
import classes from './leaderboard.module.css';

export default function MatchmakerLeaderboardPage() {
  const { id } = useParams();
  const mid = Number(id);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await getPadelMatch(mid);
      if (requestSucceeded(res as any) && res?.data?.data?.leaderboard) {
        setRows(res.data.data.leaderboard);
      }
    })();
  }, [mid]);

  const champion = rows.length > 0 ? rows[0] : null;

  return (
    <Stack>
      <Group justify="space-between" align="end">
        <div>
          <Title order={3}>Leaderboard</Title>
          <Text size="sm" c="dimmed">
            Live ranking based on current match results.
          </Text>
        </div>
        <Badge className={classes.metaBadge} leftSection={<IconArrowUpRight size={14} />}>
          {rows.length} players
        </Badge>
      </Group>
      <Text size="sm" c="dimmed">
        G = games · W-L-T · DIFF = points for − against · +M = points scored · P = position
      </Text>
      {champion && (
        <Card className={classes.championCard} radius="xl" p="lg" withBorder>
          <Group justify="space-between" align="center" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon size={42} radius="xl" className={classes.championIcon}>
                <IconCrown size={22} />
              </ThemeIcon>
              <div>
                <Text className={classes.championLabel}>Champion</Text>
                <Text className={classes.championName}>{champion.name}</Text>
                <Text size="xs" c="dimmed">
                  Rank #{champion.p} · {champion.wlt} · DIFF {champion.diff > 0 ? `+${champion.diff}` : champion.diff}
                </Text>
              </div>
            </Group>
            <Badge className={classes.championBadge} leftSection={<IconSparkles size={12} />}>
              Winner
            </Badge>
          </Group>
        </Card>
      )}
      <Paper withBorder p="md" className={classes.tableShell}>
        <ScrollArea>
          <Table className={classes.table} highlightOnHover horizontalSpacing="md" verticalSpacing="sm">
            <Table.Thead className={classes.thead}>
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
              {rows.map((r) => (
                <Table.Tr key={r.player_id} className={classes.row}>
                  <Table.Td>
                    <Badge
                      variant={r.p <= 3 ? 'filled' : 'light'}
                      color={r.p === 1 ? 'yellow' : r.p <= 3 ? 'teal' : 'gray'}
                      leftSection={r.p === 1 ? <IconTrophy size={12} /> : null}
                    >
                      {r.p}
                    </Badge>
                  </Table.Td>
                  <Table.Td className={classes.nameCell}>{r.name}</Table.Td>
                  <Table.Td>{r.g}</Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="green">
                      {r.wlt}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={700} c={r.diff > 0 ? 'teal' : r.diff < 0 ? 'red' : 'dimmed'}>
                      {r.diff > 0 ? `+${r.diff}` : r.diff}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={6}>
                      <ThemeIcon size={18} radius="xl" variant="light" color="brand">
                        <IconArrowUpRight size={12} />
                      </ThemeIcon>
                      <Text fw={700}>{r.plus_m}</Text>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>
    </Stack>
  );
}
