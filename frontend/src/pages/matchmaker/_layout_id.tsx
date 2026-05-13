import { Badge, Container, Group, Tabs, Text, ThemeIcon } from '@mantine/core';
import { IconChartBar, IconListDetails, IconSwords, IconTrophy } from '@tabler/icons-react';
import { Outlet, useLocation, useParams, Link } from 'react-router';

import Layout from '../_layout';
import classes from './_layout_id.module.css';

export default function MatchmakerIdLayout() {
  const { id } = useParams();
  const location = useLocation();
  const base = `/matchmaker/${id}`;

  const tab = location.pathname.endsWith('/leaderboard')
    ? 'leaderboard'
    : location.pathname.endsWith('/simulation')
      ? 'simulation'
      : 'rounds';

  return (
    <Layout
      breadcrumbs={
        <Group gap={8} className={classes.breadcrumbBrand} wrap="nowrap">
          <ThemeIcon size={22} radius="xl" variant="light" className={classes.breadcrumbIcon}>
            <IconTrophy size={14} />
          </ThemeIcon>
          <Text className={classes.breadcrumbText}>Padel Matchmaker</Text>
        </Group>
      }
    >
      <Container size="lg">
        <Tabs
          value={tab}
          mb="md"
          classNames={{
            root: classes.tabsRoot,
            list: classes.tabsList,
            tab: classes.tab,
            tabLabel: classes.tabLabel,
          }}
        >
          <div className={classes.tabsHeader}>
            <div>
              <Text className={classes.heading}>Match Workspace</Text>
              <Text className={classes.subheading}>Switch between simulation, scoring rounds, and leaderboard.</Text>
            </div>
            <Badge variant="light" className={classes.badge}>
              Session {id}
            </Badge>
          </div>
          <Tabs.List grow>
            <Tabs.Tab
              value="simulation"
              component={Link}
              to={`${base}/simulation`}
              leftSection={<IconSwords size={16} />}
            >
              Simulation
            </Tabs.Tab>
            <Tabs.Tab
              value="rounds"
              component={Link}
              to={`${base}/rounds`}
              leftSection={<IconListDetails size={16} />}
            >
              Rounds
            </Tabs.Tab>
            <Tabs.Tab
              value="leaderboard"
              component={Link}
              to={`${base}/leaderboard`}
              leftSection={<IconChartBar size={16} />}
            >
              Leaderboard
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>
        <Outlet />
      </Container>
    </Layout>
  );
}
