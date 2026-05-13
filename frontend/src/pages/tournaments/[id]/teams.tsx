import { Grid, Group, Modal, Select, TextInput, Title } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconLinkPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SWRResponse } from 'swr';

import SaveButton from '@components/buttons/save';
import TeamCreateModal from '@components/modals/team_create_modal';
import { getTableState, tableStateToPagination } from '@components/tables/table';
import TeamsTable from '@components/tables/teams';
import { capitalize, getTournamentIdFromRouter, responseIsValid } from '@components/utils/util';
import { FullTeamWithPlayers, StageItemWithRounds, TeamsWithPlayersResponse } from '@openapi';
import TournamentLayout from '@pages/tournaments/_tournament_layout';
import { getStages, getTeamsPaginated } from '@services/adapter';
import { getStageItemList, getStageItemTeamIdsLookup } from '@services/lookups';
import { createTeamsFromReclub } from '@services/team';

function StageItemSelect({
  groupStageItems,
  setFilteredStageItemId,
}: {
  groupStageItems: any;
  setFilteredStageItemId: any;
}) {
  const { t } = useTranslation();
  if (groupStageItems == null) return null;
  const data = groupStageItems.map(([stage_item]: [StageItemWithRounds]) => ({
    value: `${stage_item.id}`,
    label: `${stage_item.name}`,
  }));
  return (
    <Select
      data={data}
      label={t('filter_stage_item_label')}
      placeholder={t('filter_stage_item_placeholder')}
      searchable
      limit={25}
      onChange={setFilteredStageItemId}
    />
  );
}

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

function ReclubImportModal({
  tournament_id,
  swrTeamsResponse,
}: {
  tournament_id: number;
  swrTeamsResponse: SWRResponse<TeamsWithPlayersResponse>;
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
    const response = await createTeamsFromReclub(tournament_id, reclubLink.trim(), true);
    setIsFetching(false);

    if (response == null || response.data == null) {
      return;
    }

    await swrTeamsResponse.mutate();
    setOpened(false);
    setReclubLink('');
    showNotification({
      color: 'green',
      title: 'Teams imported',
      message: 'Confirmed Reclub participants were added as pairs.',
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

export default function TeamsPage() {
  const tableState = getTableState('name');
  const { t } = useTranslation();
  const [filteredStageItemId, setFilteredStageItemId] = useState(null);
  const { tournamentData } = getTournamentIdFromRouter();
  const swrTeamsResponse = getTeamsPaginated(tournamentData.id, tableStateToPagination(tableState));
  const swrStagesResponse = getStages(tournamentData.id);
  const stageItemInputLookup = responseIsValid(swrStagesResponse)
    ? getStageItemList(swrStagesResponse)
    : [];
  const stageItemTeamLookup = responseIsValid(swrStagesResponse)
    ? getStageItemTeamIdsLookup(swrStagesResponse)
    : {};

  let teams: FullTeamWithPlayers[] =
    swrTeamsResponse.data != null ? swrTeamsResponse.data.data.teams : [];
  const teamCount = swrTeamsResponse.data != null ? swrTeamsResponse.data.data.count : 1;

  if (filteredStageItemId != null) {
    teams = (swrTeamsResponse.data?.data.teams || []).filter(
      (team: FullTeamWithPlayers) =>
        stageItemTeamLookup[filteredStageItemId].indexOf(team.id) !== -1
    );
  }

  return (
    <TournamentLayout tournament_id={tournamentData.id}>
      <Grid mb="1rem">
        <Grid.Col span={12}>
          <Title>{capitalize(t('teams_title'))}</Title>
        </Grid.Col>
        <Grid.Col span={12}>
          <Grid align="flex-end" justify="flex-start">
            <Grid.Col span="auto">
              <MaxRowsSelect tableState={tableState} />
            </Grid.Col>
            <Grid.Col span="auto">
              <StageItemSelect
                groupStageItems={Object.values(stageItemInputLookup)}
                setFilteredStageItemId={setFilteredStageItemId}
              />
            </Grid.Col>
            <Grid.Col span="content">
              <Group gap="xs">
                <TeamCreateModal
                  swrTeamsResponse={swrTeamsResponse}
                  tournament_id={tournamentData.id}
                />
                <ReclubImportModal
                  tournament_id={tournamentData.id}
                  swrTeamsResponse={swrTeamsResponse}
                />
              </Group>
            </Grid.Col>
          </Grid>
        </Grid.Col>
      </Grid>
      <TeamsTable
        swrTeamsResponse={swrTeamsResponse}
        tournamentData={tournamentData}
        teams={teams}
        tableState={tableState}
        teamCount={teamCount}
      />
    </TournamentLayout>
  );
}
