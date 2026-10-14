import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './test/utils';
import DashboardScreen from './screens/DashboardScreen';
import AudienceScreen from './screens/AudienceScreen';
import CampaignsScreen from './screens/CampaignsScreen';
import AutomationsScreen from './screens/AutomationsScreen';
import FormsScreen from './screens/FormsScreen';
import IntelligenceScreen from './screens/IntelligenceScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import SettingsScreen from './screens/SettingsScreen';

/* Every screen gets an axe pass, not just the two simple ones.
 *
 * The screens that were previously unaudited are the ones carrying the complex widgets —
 * the automation canvas, the 3-stage form builder, the campaign detail — which is exactly
 * where custom controls built out of divs and buttons tend to lose their accessible names.
 *
 * The second block matters more than the first: a landing-state pass only proves the empty
 * screen is clean. Most of these surfaces are only interesting after a click, so the
 * builders and detail views are audited in their opened state too. */

const SCREENS: [string, () => React.ReactElement][] = [
  ['Dashboard', () => <DashboardScreen />],
  ['Audience', () => <AudienceScreen />],
  ['Campaigns', () => <CampaignsScreen />],
  ['Automations', () => <AutomationsScreen />],
  ['Forms', () => <FormsScreen />],
  ['Intelligence', () => <IntelligenceScreen />],
  ['Analytics', () => <AnalyticsScreen />],
  ['Settings', () => <SettingsScreen />],
];

describe('accessibility — every screen at rest', () => {
  it.each(SCREENS)('%s has no detectable a11y violations', async (_name, render) => {
    const { container } = renderWithProviders(render());
    expect(await axe(container)).toHaveNoViolations();
  }, 20_000);
});

describe('accessibility — the states you have to click into', () => {
  it('campaign detail page', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<CampaignsScreen />);
    await user.click(await screen.findByText('Gas rebate week'));
    expect(await axe(container)).toHaveNoViolations();
  }, 20_000);

  it('campaign wizard', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<CampaignsScreen />);
    await user.click(screen.getByRole('button', { name: /Create campaign/ }));
    expect(await axe(container)).toHaveNoViolations();
  }, 20_000);

  it('automation canvas builder', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<AutomationsScreen />);
    await user.click(screen.getByRole('button', { name: /New Loop/ }));
    await user.click(screen.getByText('Start from scratch'));
    expect(await axe(container)).toHaveNoViolations();
  }, 20_000);

  it('automation stats view', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<AutomationsScreen />);
    await user.click(screen.getByText('Welcome new wallets'));
    await user.click(screen.getByRole('button', { name: 'Stats' }));
    expect(await axe(container)).toHaveNoViolations();
  }, 20_000);

  it('form builder', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<FormsScreen />);
    await user.click(screen.getByRole('button', { name: /New form/ }));
    await waitFor(() => expect(screen.getByText('Select a style')).toBeInTheDocument());
    expect(await axe(container)).toHaveNoViolations();
  }, 20_000);

  it('intelligence result with generated SQL', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<IntelligenceScreen />);
    await user.click(screen.getByText('Top holders by token'));
    await user.click(screen.getByRole('button', { name: /SQL/ }));
    expect(await axe(container)).toHaveNoViolations();
  }, 20_000);
});
