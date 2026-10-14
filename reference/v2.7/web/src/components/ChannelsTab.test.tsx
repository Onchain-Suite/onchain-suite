/* Channels is read before it is configured: every channel's state in one place, a setup
   panel only when you open its row. These pin that shape against the page it replaced —
   every form open at once under a handoff checklist. */
import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/utils';
import { ChannelsTab } from './ChannelsTab';

describe('Integrations → Channels', () => {
  it('opens on the state of every channel, not on a setup form', () => {
    renderWithProviders(<ChannelsTab />);

    expect(screen.getByText(/0 of 3 can send/)).toBeInTheDocument();
    const rows = screen.getAllByRole('listitem').map((li) => within(li).getByRole('button'));
    expect(rows.map((r) => r.querySelector('b')?.textContent)).toEqual(['Email', 'In-app push', 'X']);
    // Each row carries its own blocker, in words.
    expect(within(rows[0]).getByText('No verified sending domain')).toBeInTheDocument();
    // No channel's setup form is open until asked for.
    expect(screen.queryByLabelText('dApp origin')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Sending domain')).not.toBeInTheDocument();
  });

  it('opens one channel at a time, with both push installs together, and comes back', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChannelsTab />);

    await user.click(screen.getByRole('button', { name: /^In-app push/ }));
    expect(screen.getByRole('heading', { name: 'In-app push' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Web' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mobile' })).toBeInTheDocument();
    expect(screen.getByLabelText('dApp origin')).toBeInTheDocument();
    // Handing it over sits with the steps it hands over.
    expect(screen.getByText('Not yours to do?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Channels' }));
    expect(screen.getByText(/0 of 3 can send/)).toBeInTheDocument();
  });

  it('keeps bulk handoff to one button rather than a form above every channel', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChannelsTab />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Send setup to someone/ }));
    expect(screen.getByRole('dialog', { name: 'Send setup to someone else' })).toBeInTheDocument();
  });
});
