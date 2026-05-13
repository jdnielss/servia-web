import { Anchor, Paper, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import SaveButton from '@components/buttons/save';
import { requestSucceeded } from '@services/adapter';
import { listPadelMatches } from '@services/padel_matchmaker';
import Layout from '../_layout';

export default function MatchmakerIndexPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await listPadelMatches();
      if (requestSucceeded(res as any) && res?.data?.data) {
        setRows(res.data.data);
      }
    })();
  }, []);

  return (
    <Layout breadcrumbs={<span>Padel Matchmaker</span>}>
      <Stack>
        <Title order={2}>Padel Matchmaker</Title>
        <SaveButton component={Link} to="/matchmaker/create" title="Create Match" mx={0} />
        <Paper withBorder p="md" mt="md">
          <Title order={4} mb="sm">
            Your matches
          </Title>
          {rows.length === 0 ? (
            <Text c="dimmed">No matches yet.</Text>
          ) : (
            <Stack gap="xs">
              {rows.map((m) => (
                <Anchor key={m.id} component={Link} to={`/matchmaker/${m.id}/simulation`}>
                  {m.name} — {m.match_type} ({m.status})
                </Anchor>
              ))}
            </Stack>
          )}
        </Paper>
      </Stack>
    </Layout>
  );
}
