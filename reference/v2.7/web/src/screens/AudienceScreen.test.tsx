import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/utils';
import AudienceScreen from './AudienceScreen';
import { CONTACTS } from '../data/mock';

describe('AudienceScreen', () => {
  it('drills into a list and shows member wallets WITH their emails', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AudienceScreen />);

    await user.click(screen.getByRole('tab', { name: /Lists/ }));
    await user.click(screen.getByText('Season 2 waitlist'));

    // The drill-down view: back affordance + member rows.
    expect(screen.getByText(/Back to lists/)).toBeInTheDocument();
    expect(screen.getByText(/email-reachable/)).toBeInTheDocument();
    // Imported members expose an address; ZK-protected members are masked, never leaking the email.
    const visible = screen.getAllByText(/@(proton\.me|gmail\.com|example\.com)/);
    const protectedCells = screen.getAllByText(/ZK-protected/);
    expect(visible.length).toBeGreaterThan(0);
    expect(protectedCells.length).toBeGreaterThan(0);
  });

  it('never renders a raw address for a ZK-protected contact', () => {
    renderWithProviders(<AudienceScreen />);
    /* Derived from the data, never hardcoded.
     *
     * This assertion used to name a demo handle directly. A later pass renamed the demo
     * audience, and the test kept passing — against a string that could no longer appear
     * anywhere, whatever the component did. A privacy check that cannot fail is worse than
     * no check, because it reads as coverage. */
    const zk = CONTACTS.find((c) => c.zkVerified && c.ens);
    expect(zk).toBeDefined();
    const handle = zk!.ens!.replace('.eth', '');
    // The contact is on screen — so the absence below is the component withholding the
    // email, not the row being missing. Without this line the test passes on an empty page.
    expect(screen.getAllByText(new RegExp(handle)).length).toBeGreaterThan(0);
    expect(screen.queryByText(new RegExp(`${handle}@`))).not.toBeInTheDocument();
  });

  it('drills into a tag and shows tagged wallets', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AudienceScreen />);
    await user.click(screen.getByRole('tab', { name: /Tags/ }));
    await user.click(screen.getByText('whale'));
    expect(screen.getByText(/Back to tags/)).toBeInTheDocument();
  });

  it('creates a list and shows it in the table live', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AudienceScreen />);
    await user.click(screen.getByRole('tab', { name: /Lists/ }));
    await user.click(screen.getByRole('button', { name: 'New list' }));

    const dialog = screen.getByRole('dialog', { name: 'New list' });
    await user.type(within(dialog).getByPlaceholderText(/Newsletter subscribers/), 'QA regression list');
    await user.click(within(dialog).getByRole('button', { name: 'Create list' }));

    expect(await screen.findByText('QA regression list')).toBeInTheDocument();
  });
});
