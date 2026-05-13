import { Grid, Group, Modal, Select, TextInput, Title } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconLinkPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

import SaveButton from '@components/buttons/save';
import PlayerCreateModal from '@components/modals/player_create_modal';
import PlayersTable from '@components/tables/players';
import { getTableState, tableStateToPagination } from '@components/tables/table';
import { capitalize, getTournamentIdFromRouter } from '@components/utils/util';
import TournamentLayout from '@pages/tournaments/_tournament_layout';
import { getPlayersPaginated } from '@services/adapter';
import { createPlayersFromReclub } from '@services/player';

function MaxRowsSelect({ tableState }: { tableState: any }) {
  return (
    <Select
      data={[
        { value: '10', label: '10 rows' },
        { value: '25', label: '25 rows' },
        { value: '50', label: '50 rows' },
        { value: '100', label: '100 rows' },
      ]}
      value={String(tableState.pageSize)}
      label="Max Data"
      onChange={(value) => {
        if (value == null) return;
        tableState.setPageSize(parseInt(value, 10));
        tableState.setPage(1);
      }}
    />
  );
}

function ReclubImportPlayersModal({
  tournament_id,
  swrPlayersResponse,
}: {
  tournament_id: number;
  swrPlayersResponse: any;
}) {
  const [opened, setOpened] = useState(false);
  const [reclubLink, setReclubLink] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  async function fetchReclubParticipants() {
    if (reclubLink.trim().length < 1) {
      showNotification({
        color: 'red',
        title: 'Invalid link',
        message: 'Please enter a Reclub link.',
      });
      return;
    }

    setIsFetching(true);
    const response = await createPlayersFromReclub(tournament_id, reclubLink.trim(), true);
    setIsFetching(false);

    if (response == null || response.data == null) {
      return;
    }

    await swrPlayersResponse.mutate();
    setOpened(false);
    setReclubLink('');
    showNotification({
      color: 'green',
      title: 'Players imported',
      message: 'Confirmed Reclub participants were added as players.',
    });
  }

  return (
    <>
      <Modal opened={opened} onClose={() => setOpened(false)} title="Add from Reclub">
        <TextInput
          label="Enter a reclub link"
          placeholder="https://reclub.co/id/m/TXCRZ0"
          value={reclubLink}
          onChange={(event) => setReclubLink(event.currentTarget.value)}
        />
        <SaveButton title="Fetch" mt="md" mx={0} onClick={fetchReclubParticipants} loading={isFetching} />
      </Modal>
      <SaveButton
        onClick={() => setOpened(true)}
        leftSection={<IconLinkPlus size={20} />}
        title="Add from Reclub"
        mb={0}
      />
    </>
  );
}

export default function PlayersPage() {
  const tableState = getTableState('name');
  const { tournamentData } = getTournamentIdFromRouter();
  const swrPlayersResponse = getPlayersPaginated(
    tournamentData.id,
    tableStateToPagination(tableState)
  );
  const playerCount = swrPlayersResponse.data != null ? swrPlayersResponse.data.data.count : 1;
  const { t } = useTranslation();
  return (
    <TournamentLayout tournament_id={tournamentData.id}>
      <Grid mb="1rem">
        <Grid.Col span={12}>
          <Title>{capitalize(t('players_title'))}</Title>
        </Grid.Col>
        <Grid.Col span={12}>
          <Grid align="flex-end" justify="flex-start">
            <Grid.Col span="auto">
              <MaxRowsSelect tableState={tableState} />
            </Grid.Col>
            <Grid.Col span="content">
              <Group gap="xs">
                <PlayerCreateModal
                  swrPlayersResponse={swrPlayersResponse}
                  tournament_id={tournamentData.id}
                />
                <ReclubImportPlayersModal
                  tournament_id={tournamentData.id}
                  swrPlayersResponse={swrPlayersResponse}
                />
              </Group>
            </Grid.Col>
          </Grid>
        </Grid.Col>
      </Grid>
      <PlayersTable
        playerCount={playerCount}
        swrPlayersResponse={swrPlayersResponse}
        tournamentData={tournamentData}
        tableState={tableState}
      />
    </TournamentLayout>
  );
}
