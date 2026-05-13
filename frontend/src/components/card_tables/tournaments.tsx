import { ActionIcon, Badge, Card, Group, Image, Text, Tooltip } from '@mantine/core';
import { IconExternalLink, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { SWRResponse } from 'swr';

import { EmptyTableInfo } from '@components/no_content/empty_table_info';
import { DateTime } from '@components/utils/datetime';
import RequestErrorAlert from '@components/utils/error_alert';
import PreloadLink from '@components/utils/link';
import { TableSkeletonSingleColumn } from '@components/utils/skeletons';
import { Tournament, TournamentsResponse } from '@openapi';
import { getBaseApiUrl } from '@services/adapter';
import classes from './tournaments.module.css';

export function TournamentLogo({ tournament }: { tournament: Tournament }) {
  return (
    <Image
      radius="md"
      alt="Logo of the tournament"
      src={`${getBaseApiUrl()}/static/tournament-logos/${tournament.logo_path}`}
      fallbackSrc={`https://placehold.co/318x160?text=${tournament.name}`}
      height={160}
    />
  );
}

function Stat({ title, value }: { title: string; value: any }) {
  return (
    <div key={title}>
      <Text size="xs" c="dimmed">
        {title}
      </Text>
      <Text fw={500} size="sm">
        {value}
      </Text>
    </div>
  );
}

export default function TournamentsCardTable({
  swrTournamentsResponse,
  tournamentsOverride,
  onDeleteTournament,
}: {
  swrTournamentsResponse: SWRResponse<TournamentsResponse>;
  tournamentsOverride?: Tournament[];
  onDeleteTournament?: (tournament: Tournament) => Promise<void> | void;
}) {
  const { t } = useTranslation();

  if (swrTournamentsResponse.error) {
    return <RequestErrorAlert error={swrTournamentsResponse.error} />;
  }
  if (swrTournamentsResponse.isLoading) {
    return <TableSkeletonSingleColumn />;
  }

  const tournaments: Tournament[] = tournamentsOverride
    ? [...tournamentsOverride]
    : swrTournamentsResponse.data != null
      ? swrTournamentsResponse.data.data
      : [];

  const rows = tournaments
    .sort((t1: Tournament, t2: Tournament) => t1.name.localeCompare(t2.name))
    .map((tournament) => (
      <Group key={tournament.id} className={classes.card}>
        <Card shadow="sm" padding="lg" radius="md" withBorder w="100%">
          <Card.Section component={PreloadLink} href={`/tournaments/${tournament.id}/stages`}>
            <TournamentLogo tournament={tournament} />
          </Card.Section>

          <Group justify="space-between" mt="md" mb="xs">
            <Text fw={500} lineClamp={1}>
              {tournament.name}
            </Text>
          </Group>

          <Card.Section className={classes.section}>
            <Stat title={t('start_time')} value={<DateTime datetime={tournament.start_time} />} />
          </Card.Section>

          <Card.Section className={classes.section}>
            <Group w="100%">
              <Badge
                fullWidth
                color="yellow"
                variant="outline"
                size="lg"
                style={{ visibility: tournament.status === 'ARCHIVED' ? 'visible' : 'hidden' }}
              >
                {t('archived_label')}
              </Badge>
            </Group>
          </Card.Section>
          <Card.Section className={classes.section}>
            <Group gap="xs" justify="flex-end">
              <Tooltip label="Open">
                <ActionIcon
                  component={PreloadLink}
                  href={`/tournaments/${tournament.id}/stages`}
                  size="lg"
                  radius="md"
                  variant="light"
                  color="blue"
                  aria-label="Open tournament"
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
                  aria-label="Delete tournament"
                  onClick={async () => {
                    if (!onDeleteTournament) return;
                    await onDeleteTournament(tournament);
                  }}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Card.Section>
        </Card>
      </Group>
    ));

  if (rows.length < 1) return <EmptyTableInfo entity_name={t('tournaments_title')} />;

  return (
    <Group gap="sm" style={{ width: '100%' }}>
      {rows}
    </Group>
  );
}
