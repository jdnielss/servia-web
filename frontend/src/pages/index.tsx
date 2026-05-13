import { ActionIcon, Badge, Card, Grid, Group, Paper, Select, Stack, Text, TextInput, Title, Tooltip } from '@mantine/core';
import { IconCalendarPlus, IconExternalLink, IconSearch, IconTrash } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import SaveButton from '@components/buttons/save';
import TournamentsCardTable from '@components/card_tables/tournaments';
import TournamentModal from '@components/modals/tournament_modal';
import { TournamentFilter } from '@components/utils/tournament';
import { capitalize } from '@components/utils/util';
import { Tournament } from '@openapi';
import { checkForAuthError, getTournaments, requestSucceeded } from '@services/adapter';
import { deletePadelMatch, listPadelMatches } from '@services/padel_matchmaker';
import { deleteTournament } from '@services/tournament';
import Layout from './_layout';
import classes from './index.module.css';

export default function HomePage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<TournamentFilter>('OPEN');
  const [searchScope, setSearchScope] = useState<'ALL' | 'TOURNAMENTS' | 'MATCHMAKER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const [matchmakerRows, setMatchmakerRows] = useState<any[]>([]);

  const swrTournamentsResponse = getTournaments(filter);
  checkForAuthError(swrTournamentsResponse);

  const loadMatchmakers = async () => {
    const res = await listPadelMatches();
    if (res != null && (res as any).name !== 'AxiosError' && (res as any).data?.data != null) {
      setMatchmakerRows((res as any).data.data);
    }
  };

  useEffect(() => {
    void loadMatchmakers();
  }, []);

  const tournaments = swrTournamentsResponse.data?.data ?? [];
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searchAppliesToTournament = searchScope === 'ALL' || searchScope === 'TOURNAMENTS';
  const searchAppliesToMatchmaker = searchScope === 'ALL' || searchScope === 'MATCHMAKER';
  const tournamentsFiltered = useMemo(() => {
    if (normalizedQuery.length < 1 || !searchAppliesToTournament) return tournaments;
    return tournaments.filter((x: Tournament) =>
      [x.name, x.status].join(' ').toLowerCase().includes(normalizedQuery),
    );
  }, [tournaments, normalizedQuery, searchAppliesToTournament]);
  const matchmakerFiltered = useMemo(() => {
    const statusFiltered =
      filter === 'ALL'
        ? matchmakerRows
        : filter === 'ARCHIVED'
          ? matchmakerRows.filter((x) => x.status === 'COMPLETED')
          : matchmakerRows.filter((x) => x.status !== 'COMPLETED');
    if (normalizedQuery.length < 1 || !searchAppliesToMatchmaker) return statusFiltered;
    return statusFiltered.filter((x) =>
      [x.name, x.status, x.match_type, x.scoring_type].join(' ').toLowerCase().includes(normalizedQuery),
    );
  }, [filter, matchmakerRows, normalizedQuery, searchAppliesToMatchmaker]);
  const tournamentCount = tournaments.length;
  const openMatchmakerCount = matchmakerRows.filter((x) => x.status !== 'COMPLETED').length;
  const archivedMatchmakerCount = matchmakerRows.filter((x) => x.status === 'COMPLETED').length;

  const getStatusColor = (status: string) => {
    if (status === 'ACTIVE') return 'green';
    if (status === 'COMPLETED') return 'yellow';
    if (status === 'PREVIEW') return 'blue';
    return 'gray';
  };

  return (
    <Layout>
      <div className={classes.pageShell}>
      <Paper className={classes.hero} p="lg" radius="md">
        <Grid align="center">
          <Grid.Col span={12}>
            <Badge className={classes.heroBadge} variant="light">
              Servia
            </Badge>
            <Text className={classes.heroTitle}>Dashboard Overview</Text>
            <Text className={classes.heroSubtitle} mt={6}>
              Manage your tournaments and matchmaker sessions in one place.
            </Text>
          </Grid.Col>
        </Grid>
      </Paper>

      <Paper className={`${classes.sectionCard} ${classes.stickyControls}`} p="md" radius="md" mt="md">
        <div className={classes.sectionHeader}>
          <div>
            <Text className={classes.sectionLabel}>Quick Actions</Text>
          </div>
        </div>
        <Grid>
          <Grid.Col span={{ base: 12, md: 5 }}>
            <TextInput
              size="md"
              placeholder="Search tournaments and matchmaker"
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Select
              size="md"
              data={[
                { label: 'All data', value: 'ALL' },
                { label: 'Tournaments only', value: 'TOURNAMENTS' },
                { label: 'Matchmaker only', value: 'MATCHMAKER' },
              ]}
              allowDeselect={false}
              value={searchScope}
              onChange={(v) => setSearchScope((v as 'ALL' | 'TOURNAMENTS' | 'MATCHMAKER') ?? 'ALL')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Select
              size="md"
              placeholder="Filter status"
              data={[
                { label: 'All', value: 'ALL' },
                { label: 'Archived', value: 'ARCHIVED' },
                { label: 'Open', value: 'OPEN' },
              ]}
              allowDeselect={false}
              value={filter}
              // @ts-ignore
              onChange={(f: TournamentFilter) => setFilter(f)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TournamentModal swrTournamentsResponse={swrTournamentsResponse} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <SaveButton
              mx="0px"
              fullWidth
              onClick={() => navigate('/matchmaker/create')}
              leftSection={<IconCalendarPlus size={24} />}
              title="Create Match"
            />
          </Grid.Col>
        </Grid>
      </Paper>

      <Grid mt="md">
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card
            className={`${classes.statCardClickable} ${classes.statCardTournaments}`}
            radius="md"
            p="md"
            onClick={() => setFilter('ALL')}
          >
            <Text size="sm" c="dimmed">
              Visible tournaments
            </Text>
            <Title order={2}>{tournamentCount}</Title>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card
            className={`${classes.statCardClickable} ${classes.statCardActive}`}
            radius="md"
            p="md"
            onClick={() => setFilter('OPEN')}
          >
            <Text size="sm" c="dimmed">
              Active matchmaker sessions
            </Text>
            <Title order={2}>{openMatchmakerCount}</Title>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card
            className={classes.statCardClickable}
            radius="md"
            p="md"
            onClick={() => setFilter('ARCHIVED')}
          >
            <Text size="sm" c="dimmed">
              Archived matchmaker sessions
            </Text>
            <Title order={2}>{archivedMatchmakerCount}</Title>
          </Card>
        </Grid.Col>
      </Grid>

      <Stack gap="lg" mt="md">
        <Paper className={classes.sectionCard} p="md" radius="md">
          <div className={classes.sectionHeader}>
            <div>
              <Text className={classes.sectionLabel}>Organize</Text>
              <Title order={4}>{capitalize(t('tournaments_title'))}</Title>
            </div>
            <Badge variant="light" color="brand">
              {filter}
            </Badge>
          </div>
          <TournamentsCardTable
            swrTournamentsResponse={swrTournamentsResponse}
            tournamentsOverride={tournamentsFiltered}
            onDeleteTournament={async (tournament) => {
              if (!window.confirm(`Delete tournament "${tournament.name}"? This cannot be undone.`)) return;
              const res = await deleteTournament(tournament.id);
              if (requestSucceeded(res as any)) {
                await swrTournamentsResponse.mutate();
              }
            }}
          />
        </Paper>

        <Paper className={classes.sectionCard} p="md" radius="md">
          <div className={classes.sectionHeader}>
            <div>
              <Text className={classes.sectionLabel}>Sessions</Text>
              <Title order={4}>Matchmaker List</Title>
            </div>
            <Badge variant="outline" color="blue">
              {matchmakerFiltered.length} items
            </Badge>
          </div>
          {matchmakerFiltered.length === 0 ? (
            <Text c="dimmed">No matchmaker sessions for this filter.</Text>
          ) : (
            <Stack gap="sm">
              {matchmakerFiltered.map((m) => (
                <Card key={m.id} className={classes.matchmakerCard} radius="xl" p="md">
                  <Group justify="space-between">
                    <div>
                      <Text fw={600}>{m.name}</Text>
                      <Text size="sm" c="dimmed">
                        {m.match_type}
                      </Text>
                    </div>
                    <Group>
                      <Badge color={getStatusColor(m.status)} variant="light">
                        {m.status}
                      </Badge>
                      <Tooltip label="Open">
                        <ActionIcon
                          size="lg"
                          radius="md"
                          variant="light"
                          color="blue"
                          aria-label="Open matchmaker"
                          onClick={() => navigate(`/matchmaker/${m.id}/simulation`)}
                        >
                          <IconExternalLink size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete">
                        <ActionIcon
                          size="lg"
                          radius="md"
                          variant="light"
                          color="red"
                          aria-label="Delete matchmaker"
                          onClick={async () => {
                            if (!window.confirm(`Delete matchmaker "${m.name}"? This cannot be undone.`)) return;
                            const res = await deletePadelMatch(m.id);
                            if (requestSucceeded(res as any)) {
                              await loadMatchmakers();
                            }
                          }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                </Card>
              ))}
            </Stack>
          )}
        </Paper>
      </Stack>
      </div>
    </Layout>
  );
}
