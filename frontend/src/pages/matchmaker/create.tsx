import {
  Alert,
  Checkbox,
  Collapse,
  Container,
  Grid,
  Group,
  Modal,
  NumberInput,
  Paper,
  Radio,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import SaveButton from '@components/buttons/save';
import { createAxios, getTournaments, requestSucceeded } from '@services/adapter';
import {
  createPadelMatch,
  MatchmakerMatchType,
  reclubPreview,
  simulatePadelMatch,
} from '@services/padel_matchmaker';
import Layout from '../_layout';
import { NORMAL_FORMAT_OPTIONS, type NormalFormatNew } from './normal_format';

const MATCH_TYPES: { value: MatchmakerMatchType; label: string }[] = [
  { value: 'AMERICANO', label: 'Americano' },
  { value: 'TEAM_AMERICANO', label: 'Team Americano' },
  { value: 'MIX_AMERICANO', label: 'Mix Americano' },
  { value: 'MEXICANO', label: 'Mexicano' },
  { value: 'TEAM_MEXICANO', label: 'Team Mexicano' },
  { value: 'MIXICANO', label: 'Mixicano' },
  { value: 'KOTH', label: 'King of the Hill' },
  { value: 'TEAM_KOTH', label: 'Team KOTH' },
];

function minPlayersForCourts(matchType: MatchmakerMatchType, courts: number) {
  const team = matchType.startsWith('TEAM_');
  return team ? courts * 2 : courts * 4;
}

export default function MatchmakerCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState('Club Session');
  const [matchType, setMatchType] = useState<MatchmakerMatchType>('AMERICANO');
  const [startTime, setStartTime] = useState<Date | null>(new Date());
  const [courts, setCourts] = useState(2);
  const [scoringType, setScoringType] = useState<'POINT' | 'NORMAL'>('POINT');
  const [pointsPerMatch, setPointsPerMatch] = useState(21);
  const [normalFormat, setNormalFormat] = useState<NormalFormatNew>('FIRST_TO_7');
  const [americanMode, setAmericanMode] = useState<'full' | 'custom'>('full');
  const [customRounds, setCustomRounds] = useState<number | string>(10);
  const [sortLb, setSortLb] = useState<'points' | 'wins'>('points');
  const [initialOrder, setInitialOrder] = useState<'registration' | 'random'>('registration');
  const [hidePublicLb, setHidePublicLb] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [players, setPlayers] = useState<{ name: string; source: 'MANUAL' | 'PLAYER' }[]>([]);
  const [draftName, setDraftName] = useState('');
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [reclubOpened, setReclubOpened] = useState(false);
  const [reclubLink, setReclubLink] = useState('');
  const [reclubLoading, setReclubLoading] = useState(false);

  const swrTournaments = getTournaments('OPEN');
  const tournaments = swrTournaments.data?.data ?? [];

  const minP = minPlayersForCourts(matchType, courts);
  const enoughPlayers = players.length >= minP;
  const teamMode = matchType.startsWith('TEAM_');
  const evenOk = !teamMode || players.length % 2 === 0;

  const estimateHint = useMemo(() => {
    const n = players.length || minP;
    if (americanMode === 'custom') return `Custom: ${customRounds} rounds (requested)`;
    const base = Math.max(6, Math.ceil(n / Math.max(1, courts)) * 2);
    return `≈ ${Math.min(120, base + n)} rounds (heuristic, final count from simulation)`;
  }, [americanMode, customRounds, courts, players.length, minP]);

  const addPlayer = () => {
    const n = draftName.trim();
    if (!n) return;
    setPlayers((p) => [...p, { name: n, source: 'MANUAL' }]);
    setDraftName('');
  };

  const removePlayer = (idx: number) => {
    setPlayers((p) => p.filter((_, i) => i !== idx));
  };

  const importFromTournament = async () => {
    if (tournamentId == null || tournamentId === '') return;
    const res = await createAxios().get(
      `tournaments/${tournamentId}/players?not_in_team=false&limit=200`
    );
    if (!requestSucceeded(res as any) || !res?.data?.data?.players) return;
    const list = res.data.data.players as { name: string }[];
    setPlayers(
      list.map((pl, i) => ({
        name: pl.name,
        source: 'PLAYER' as const,
      }))
    );
  };

  const importFromReclub = async () => {
    const link = reclubLink.trim();
    if (!link) return;
    setReclubLoading(true);
    try {
      const res = await reclubPreview(link);
      if (!requestSucceeded(res as any) || res?.data?.data?.players == null) return;
      const names = res.data.data.players as string[];
      setPlayers((prev) => [
        ...prev,
        ...names.map((n) => ({ name: n, source: 'MANUAL' as const })),
      ]);
      setReclubOpened(false);
      setReclubLink('');
    } finally {
      setReclubLoading(false);
    }
  };

  const runSimulation = async () => {
    if (!startTime || !enoughPlayers || !evenOk) return;
    const payload = {
      name,
      match_type: matchType,
      scoring_type: scoringType,
      points_per_match: pointsPerMatch,
      courts,
      start_time: startTime.toISOString(),
      players: players.map((p, i) => ({
        name: p.name,
        source: p.source,
        order_index: i,
      })),
      settings: {
        sort_leaderboard_by: sortLb,
        initial_player_order: initialOrder,
        hide_public_leaderboard: hidePublicLb,
        american_rounds_mode: americanMode,
        custom_round_count:
          americanMode === 'custom' ? Number(customRounds) || undefined : undefined,
        normal_format: normalFormat,
      },
    };
    const created = await createPadelMatch(payload);
    if (!requestSucceeded(created as any) || created?.data?.data?.id == null) {
      return;
    }
    const id = created.data.data.id as number;
    const sim = await simulatePadelMatch(
      id,
      americanMode === 'custom' ? { preview_rounds: Number(customRounds) } : undefined
    );
    if (!requestSucceeded(sim as any)) return;
    navigate(`/matchmaker/${id}/simulation`);
  };

  return (
    <Layout breadcrumbs={<span>Create Match</span>}>
      <Container size="lg">
        <Stack gap="md">
          <Title order={3}>Create Match</Title>

          {(!enoughPlayers || !evenOk) && (
            <Alert color="yellow" title="Validation">
              {!enoughPlayers &&
                `Not enough players for ${courts} court(s). Need at least ${minP} players.`}
              {enoughPlayers && !evenOk && 'Team modes need an even number of players.'}
            </Alert>
          )}

          <Paper withBorder p="md">
            <Title order={5} mb="sm">
              Match Settings
            </Title>
            <Stack>
              <TextInput label="Name" value={name} onChange={(e) => setName(e.currentTarget.value)} />
              <Select
                label="Match type"
                data={MATCH_TYPES}
                value={matchType}
                onChange={(v) => v && setMatchType(v as MatchmakerMatchType)}
              />
              <DateTimePicker
                label="Date & time"
                value={startTime}
                onChange={(v) => setStartTime(v ? new Date(v) : null)}
              />
              <NumberInput
                label="Number of courts"
                min={1}
                max={32}
                value={courts}
                onChange={(v) => setCourts(Number(v) || 1)}
              />
              <Radio.Group
                label="Scoring type"
                value={scoringType}
                onChange={(v) => setScoringType(v as 'POINT' | 'NORMAL')}
              >
                <Group>
                  <Radio value="POINT" label="Point" />
                  <Radio value="NORMAL" label="Normal" />
                </Group>
              </Radio.Group>
              {scoringType === 'NORMAL' && (
                <Select
                  label="Normal scoring format"
                  data={NORMAL_FORMAT_OPTIONS}
                  value={normalFormat}
                  onChange={(v) => v && setNormalFormat(v as NormalFormatNew)}
                />
              )}
              {scoringType === 'POINT' && (
                <Select
                  label="Points per match"
                  data={['11', '16', '21', '24', '32']}
                  value={String(pointsPerMatch)}
                  onChange={(v) => v && setPointsPerMatch(Number(v))}
                />
              )}

              <Radio.Group
                label="Americano rounds"
                value={americanMode}
                onChange={(v) => setAmericanMode(v as 'full' | 'custom')}
              >
                <Group>
                  <Radio value="full" label="Full (estimated)" />
                  <Radio value="custom" label="Custom" />
                </Group>
              </Radio.Group>
              {americanMode === 'custom' && (
                <NumberInput
                  label="Custom rounds"
                  min={1}
                  max={200}
                  value={customRounds}
                  onChange={setCustomRounds}
                />
              )}
              <Text size="sm" c="dimmed">
                Estimated rounds: {estimateHint}
              </Text>

              <Checkbox
                label="Advanced settings"
                checked={advancedOpen}
                onChange={(e) => setAdvancedOpen(e.currentTarget.checked)}
              />
              <Collapse in={advancedOpen}>
                <Stack>
                  <Select
                    label="Sort leaderboard by"
                    data={[
                      { value: 'points', label: 'Points / DIFF' },
                      { value: 'wins', label: 'Wins' },
                    ]}
                    value={sortLb}
                    onChange={(v) => v && setSortLb(v as 'points' | 'wins')}
                  />
                  <Select
                    label="Initial player order"
                    data={[
                      { value: 'registration', label: 'Registration order' },
                      { value: 'random', label: 'Random' },
                    ]}
                    value={initialOrder}
                    onChange={(v) => v && setInitialOrder(v as 'registration' | 'random')}
                  />
                  <Checkbox
                    label="Hide public leaderboard"
                    checked={hidePublicLb}
                    onChange={(e) => setHidePublicLb(e.currentTarget.checked)}
                  />
                </Stack>
              </Collapse>
            </Stack>
          </Paper>

          <Paper withBorder p="md">
            <Title order={5} mb="sm">
              Players
            </Title>
            <Grid mt="sm">
              <Grid.Col span={{ base: 12, sm: 8 }}>
                <Select
                  label="Import from tournament"
                  placeholder="Select tournament"
                  searchable
                  clearable
                  data={tournaments.map((t) => ({ value: String(t.id), label: t.name }))}
                  value={tournamentId}
                  onChange={setTournamentId}
                />
                <Text size="xs" c="dimmed" mt={4}>
                  Loads player names from that tournament (read-only).
                </Text>
                <Group mt="xs">
                  <SaveButton
                    title="Import players"
                    mx={0}
                    onClick={() => void importFromTournament()}
                    disabled={!tournamentId}
                  />
                  <SaveButton
                    title="Add from Reclub"
                    mx={0}
                    variant="light"
                    onClick={() => setReclubOpened(true)}
                  />
                </Group>
              </Grid.Col>
            </Grid>
            <Group mt="md" align="flex-end">
              <TextInput
                placeholder="Player name"
                style={{ flex: 1 }}
                value={draftName}
                onChange={(e) => setDraftName(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPlayer())}
              />
              <SaveButton title="Add" mx={0} onClick={addPlayer} />
            </Group>
            <Stack gap={4} mt="sm">
              {players.map((p, i) => (
                <Group key={`${p.name}-${i}`} justify="space-between">
                  <Text>
                    {p.name}{' '}
                    <Text span c="dimmed" size="xs">
                      ({p.source})
                    </Text>
                  </Text>
                  <SaveButton title="Remove" mx={0} variant="light" onClick={() => removePlayer(i)} />
                </Group>
              ))}
            </Stack>
          </Paper>

          <SaveButton
            title="Save & Run Simulation"
            fullWidth
            disabled={!startTime || !enoughPlayers || !evenOk}
            onClick={() => void runSimulation()}
          />
        </Stack>
      </Container>

      <Modal opened={reclubOpened} onClose={() => setReclubOpened(false)} title="Add from Reclub">
        <Stack>
          <TextInput
            label="Reclub link"
            placeholder="https://reclub.co/..."
            value={reclubLink}
            onChange={(e) => setReclubLink(e.currentTarget.value)}
          />
          <SaveButton
            title={reclubLoading ? 'Fetching…' : 'Fetch'}
            mx={0}
            fullWidth
            disabled={reclubLoading || reclubLink.trim().length < 5}
            onClick={() => void importFromReclub()}
          />
          <Text size="xs" c="dimmed">
            Import fetches “Confirmed” participants from the Reclub page.
          </Text>
        </Stack>
      </Modal>
    </Layout>
  );
}
