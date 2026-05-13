import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import '@mantine/spotlight/styles.css';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router';

import i18n from '../i18n';
import { BracketSpotlight } from './components/modals/spotlight';
import HomePage from './pages';
import NotFoundPage from './pages/404';
import ClubsPage from './pages/clubs';
import CreateAccountPage from './pages/create_account';
import CreateDemoAccountPage from './pages/demo';
import LoginPage from './pages/login';
import PasswordResetPage from './pages/password_reset';
import DashboardSchedulePage from './pages/tournaments/[id]/dashboard';
import DashboardNotFoundPage from './pages/tournaments/[id]/dashboard/dashboard_404';
import CourtsPresentPage from './pages/tournaments/[id]/dashboard/present/courts';
import StandingsPresentPage from './pages/tournaments/[id]/dashboard/present/standings';
import DashboardStandingsPage from './pages/tournaments/[id]/dashboard/standings';
import PlayersPage from './pages/tournaments/[id]/players';
import RankingsPage from './pages/tournaments/[id]/rankings';
import ResultsPage from './pages/tournaments/[id]/results';
import SchedulePage from './pages/tournaments/[id]/schedule';
import SettingsPage from './pages/tournaments/[id]/settings';
import StagesPage from './pages/tournaments/[id]/stages';
import SwissTournamentPage from './pages/tournaments/[id]/stages/swiss/[stage_item_id]';
import TeamsPage from './pages/tournaments/[id]/teams';
import UserPage from './pages/user';
import MatchmakerIdLayout from './pages/matchmaker/_layout_id';
import MatchmakerCreatePage from './pages/matchmaker/create';
import MatchmakerIndexPage from './pages/matchmaker/index';
import MatchmakerLeaderboardPage from './pages/matchmaker/[id]/leaderboard';
import MatchmakerRoundsPage from './pages/matchmaker/[id]/rounds';
import MatchmakerSimulationPage from './pages/matchmaker/[id]/simulation';
import MatchmakerPublicPage from './pages/matchmaker/public';

function MatchmakerIdIndexRedirect() {
  const { id } = useParams();
  return <Navigate to={`/matchmaker/${id}/simulation`} replace />;
}

const theme = createTheme({
  white: '#ffffff',
  primaryColor: 'brand',
  colors: {
    brand: [
      '#e6f2ee',
      '#cce5dc',
      '#99cbb8',
      '#66b293',
      '#33986f',
      '#19845a',
      '#0f6b49',
      '#02553d',
      '#014332',
      '#013227',
    ],
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5c5f66',
      '#373A40',
      '#2C2E33',
      '#25262b',
      '#1A1B1E',
      '#141517',
      '#101113',
    ],
  },
  components: {
    Button: {
      styles: {
        root: {
          backgroundColor: '#02553d',
          borderColor: '#02553d',
          color: '#ffffff',
        },
      },
    },
  },
});

function AnalyticsScript() {
  if (import.meta.env.VITE_ANALYTICS_SCRIPT_SRC == null) {
    return null;
  }

  var script = document.createElement('script');
  script.setAttribute('async', '');
  script.setAttribute('data-domain', import.meta.env.VITE_ANALYTICS_DATA_DOMAIN);
  script.setAttribute('data-website-id', import.meta.env.VITE_ANALYTICS_DATA_WEBSITE_ID);
  script.setAttribute('src', import.meta.env.VITE_ANALYTICS_SCRIPT_SRC);
  document.head.appendChild(script);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NuqsAdapter>
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <MantineProvider forceColorScheme="light" defaultColorScheme="light" theme={theme}>
            <BracketSpotlight />
            <Notifications />
            <Routes>
              <Route index element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/clubs" element={<ClubsPage />} />
              <Route path="/demo" element={<CreateDemoAccountPage />} />
              <Route path="/user" element={<UserPage />} />
              <Route path="/password-reset" element={<PasswordResetPage />} />
              <Route path="/create-account" element={<CreateAccountPage />} />

              <Route path="/matchmaker">
                <Route index element={<MatchmakerIndexPage />} />
                <Route path="create" element={<MatchmakerCreatePage />} />
                <Route path="public/:endpoint" element={<MatchmakerPublicPage />} />
                <Route path=":id" element={<MatchmakerIdLayout />}>
                  <Route index element={<MatchmakerIdIndexRedirect />} />
                  <Route path="simulation" element={<MatchmakerSimulationPage />} />
                  <Route path="rounds" element={<MatchmakerRoundsPage />} />
                  <Route path="leaderboard" element={<MatchmakerLeaderboardPage />} />
                </Route>
              </Route>

              <Route path="/tournaments">
                <Route path=":id">
                  <Route path="players" element={<PlayersPage />} />
                  <Route path="teams" element={<TeamsPage />} />
                  <Route path="schedule" element={<SchedulePage />} />
                  <Route path="rankings" element={<RankingsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="results" element={<ResultsPage />} />
                  <Route path="stages">
                    <Route index element={<StagesPage />} />
                    <Route path="swiss/:stage_item_id" element={<SwissTournamentPage />} />
                  </Route>
                  <Route path="dashboard">
                    <Route index element={<DashboardSchedulePage />} />
                    <Route path="standings" element={<DashboardStandingsPage />} />
                    <Route path="present">
                      <Route path="courts" element={<CourtsPresentPage />} />
                      <Route path="standings" element={<StandingsPresentPage />} />
                    </Route>
                    <Route path="*" element={<DashboardNotFoundPage />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </MantineProvider>
        </I18nextProvider>
      </BrowserRouter>
    </NuqsAdapter>
  </StrictMode>
);

AnalyticsScript();
