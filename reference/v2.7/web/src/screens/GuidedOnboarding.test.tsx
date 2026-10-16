/* Onboarding is three steps and does no work before payment. These pin both: the shape a
   person sees, and what is — and is not — true of the workspace when they come out of it. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { renderWithProviders } from '../test/utils';
import GuidedOnboarding from './GuidedOnboarding';
import { store, useContracts, useSender } from '../data/store';
import { setPlan, usePlan } from '../data/credits';
import { enterLiveWorkspace, useOfferRequest, usePendingProject, useProjectProfile, useWorkspaceMode } from '../data/workspace';

/** Reads back what the flow left behind, from the same hooks the app uses. */
function Probe() {
  const loc = useLocation();
  return (
    <output data-testid="probe">
      {JSON.stringify({ path: loc.pathname, mode: useWorkspaceMode(), plan: usePlan(), contracts: useContracts().length, project: usePendingProject(), profile: useProjectProfile(), offer: useOfferRequest(), sender: useSender() })}
    </output>
  );
}
const probe = () => JSON.parse(screen.getByTestId('probe').textContent ?? '{}');

const start = () => renderWithProviders(<><GuidedOnboarding /><Probe /></>, { route: '/onboarding' });

/** The three answers that qualify the account. */
async function qualify(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Project name'), 'Acme');
  await user.type(screen.getByLabelText('Website'), 'acme.xyz');
  await user.selectOptions(screen.getByLabelText('Sector'), 'DeFi');
}

// Plan and sending domain persist across tests in this file; every test starts from the same.
beforeEach(() => {
  setPlan('growth');
  store.removeDomain();
});
afterEach(() => {
  enterLiveWorkspace();
});

/** From the project step to the plan on the default path, skipping DNS and the contract. */
async function walkToPlan(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.click(screen.getByRole('button', { name: 'Skip for now' }));
  await user.click(screen.getByRole('button', { name: 'Skip for now' }));
}

/** Slide the list size to a stop. */
const slideTo = (contacts: number) => {
  const stops = [1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 75_000, 100_000];
  fireEvent.change(screen.getByLabelText('How many contacts?'), { target: { value: String(stops.indexOf(contacts)) } });
};

describe('Onboarding', () => {
  it('says up front how many steps there are, and which this is', () => {
    start();
    const progress = screen.getByRole('progressbar');
    // Five on the path where you set things up yourself, which is where it starts.
    expect(progress).toHaveAttribute('aria-valuetext', 'Step 1 of 5: Your project');
    expect(progress).toHaveAttribute('aria-valuemax', '5');
  });

  it('qualifies the account before moving on: name, website and sector', async () => {
    const user = userEvent.setup();
    start();
    const next = screen.getByRole('button', { name: 'Continue' });
    expect(next).toBeDisabled();

    await user.type(screen.getByLabelText('Project name'), 'Acme');
    await user.type(screen.getByLabelText('Website'), 'acme');
    await user.selectOptions(screen.getByLabelText('Sector'), 'DeFi');
    // "acme" is not a website yet.
    expect(next).toBeDisabled();
    await user.type(screen.getByLabelText('Website'), '.xyz');
    // Description and contract address are optional.
    expect(next).toBeEnabled();
  });

  it('moves on with Enter once the three required answers are in', async () => {
    const user = userEvent.setup();
    start();
    await user.type(screen.getByLabelText('Project name'), 'Acme{Enter}');
    // Not qualified yet, so Enter does nothing.
    expect(screen.getByRole('heading', { name: 'Tell us about your project' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Website'), 'acme.xyz');
    await user.selectOptions(screen.getByLabelText('Sector'), 'DeFi');
    await user.type(screen.getByLabelText('Website'), '{Enter}');
    expect(screen.getByRole('heading', { name: 'Who is setting up the technical side?' })).toBeInTheDocument();
  });

  it('offers the handoff only when someone else holds the technical side', async () => {
    const user = userEvent.setup();
    start();
    await qualify(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByRole('heading', { name: 'Who is setting up the technical side?' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Their email')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Someone else is/ }));
    // One email field, not the handoff checklist: picking this must not turn the step into a form.
    expect(screen.getByLabelText('Their email')).toBeInTheDocument();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);

    await user.type(screen.getByLabelText('Their email'), 'dev@acme.xyz');
    await user.click(screen.getByRole('button', { name: /Send steps/ }));
    expect(screen.getByText(/Sent to/)).toHaveTextContent('Sent to dev@acme.xyz');
    // Optional: Continue was never waiting on it.
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('ends on the chosen plan, in an empty workspace, having indexed nothing', async () => {
    const user = userEvent.setup();
    start();
    await qualify(user);
    await walkToPlan(user);

    expect(screen.getByRole('heading', { name: 'Choose your plan' })).toBeInTheDocument();
    slideTo(2_500);
    await user.click(screen.getByRole('radio', { name: 'Launch, $39 a month' }));
    await user.click(screen.getByRole('button', { name: 'Continue with Launch' }));

    // No contract was indexed on the way through; the one they named is kept to index next.
    expect(probe()).toMatchObject({ path: '/home', mode: 'empty', plan: 'launch', contracts: 0, project: 'acme.xyz' });
    // The qualification answers are kept, not dropped with the flow.
    expect(probe().profile).toMatchObject({ name: 'Acme', website: 'acme.xyz', sector: 'DeFi', contract: '' });
  });
});

describe('The branch after technical setup', () => {
  const toTechnical = async (user: ReturnType<typeof userEvent.setup>) => {
    start();
    await qualify(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
  };
  const count = () => screen.getByRole('progressbar').getAttribute('aria-valuetext');

  it('sends whoever sets it up to the sending domain, then the contract, then payment', async () => {
    const user = userEvent.setup();
    await toTechnical(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { name: 'Set up your sending domain' })).toBeInTheDocument();
    expect(count()).toBe('Step 3 of 5: Sending domain');

    await user.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(screen.getByRole('heading', { name: 'Add your smart contract' })).toBeInTheDocument();
    // It opens on what step one already has, rather than asking again.
    expect(screen.getByDisplayValue('acme.xyz')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(screen.getByRole('heading', { name: 'Choose your plan' })).toBeInTheDocument();
  });

  it('skips the contract for someone handing the setup over', async () => {
    const user = userEvent.setup();
    await toTechnical(user);
    await user.click(screen.getByRole('button', { name: /Someone else is/ }));
    expect(count()).toBe('Step 2 of 4: Technical setup');

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { name: 'Set up your sending domain' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(screen.getByRole('heading', { name: 'Choose your plan' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Add your smart contract' })).not.toBeInTheDocument();
  });

  it('keeps a sending domain set up during onboarding once the workspace opens', async () => {
    const user = userEvent.setup();
    await toTechnical(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByLabelText('Sending domain'), 'mail.acme.xyz');
    await user.click(screen.getByRole('button', { name: /Generate DNS records/ }));
    // Records are generated; verifying waits on DNS, so the step lets you move on.
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Skip for now' }));
    await user.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(probe()).toMatchObject({ path: '/home', sender: { domain: 'mail.acme.xyz', status: 'pending' } });
  });

  it('lets payment be skipped, and leaves the plan as it was', async () => {
    const user = userEvent.setup();
    start();
    await qualify(user);
    await walkToPlan(user);
    await user.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(probe()).toMatchObject({ path: '/home', mode: 'empty', plan: 'growth', offer: null });
  });
});

describe('Choosing a plan', () => {
  const toPlan = async (user: ReturnType<typeof userEvent.setup>) => {
    start();
    await qualify(user);
    await walkToPlan(user);
  };
  const radios = () => screen.getAllByRole('radio').map((r) => r.getAttribute('aria-label'));

  it('prices every tier at the list size on the slider', async () => {
    const user = userEvent.setup();
    await toPlan(user);
    // Starting from Growth: 25,000 contacts. Launch cannot hold it; Send is priced per subscriber.
    expect(screen.getByLabelText('How many contacts?')).toHaveAttribute('aria-valuetext', '25,000 contacts');
    expect(radios()).toEqual([
      'Send, $104.75 a month', 'Launch, not available at this size', 'Growth, $349 a month', 'Enterprise, custom pricing',
    ]);

    slideTo(10_000);
    // Launch now holds it, at its larger size; Growth is still Growth.
    expect(radios()).toEqual([
      'Send, $45.50 a month', 'Launch, $118 a month', 'Growth, $349 a month', 'Enterprise, custom pricing',
    ]);
    await user.click(screen.getByRole('radio', { name: 'Launch, $118 a month' }));
    expect(screen.getByRole('button', { name: 'Continue with Launch+' })).toBeInTheDocument();
  });

  it('moves a list that outgrows its tier to the smallest that holds it', async () => {
    const user = userEvent.setup();
    await toPlan(user);
    slideTo(2_500);
    await user.click(screen.getByRole('radio', { name: 'Launch, $39 a month' }));

    slideTo(25_000);
    expect(screen.getByRole('radio', { name: 'Growth, $349 a month' })).toHaveAttribute('aria-checked', 'true');
    slideTo(100_000);
    expect(screen.getByRole('radio', { name: 'Enterprise, custom pricing' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Growth, not available at this size' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('turns Enterprise into an offer request, and still opens the workspace', async () => {
    const user = userEvent.setup();
    await toPlan(user);
    slideTo(75_000);
    await user.click(screen.getByRole('button', { name: 'Request an offer' }));
    expect(probe()).toMatchObject({ path: '/home', plan: 'enterprise', offer: { contacts: 75_000 } });
  });
});

describe('Onboarding focus', () => {
  it('moves to each new step’s question, so a long step does not strand the next one', async () => {
    const user = userEvent.setup();
    start();
    await qualify(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { name: 'Who is setting up the technical side?' })).toHaveFocus();
  });
});
