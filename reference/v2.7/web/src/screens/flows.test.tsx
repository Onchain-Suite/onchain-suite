/* Interaction tests for the five ported flows. These assert behaviour a user can observe —
   state that changes, gates that hold, and the cross-screen hand-offs that make the app a
   system rather than eight screens. */
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/utils';
import AutomationsScreen, { flowMessageStats, performanceSeries } from './AutomationsScreen';
import CampaignsScreen, { campaignActivity, campaignChannelStats, comparableCampaigns } from './CampaignsScreen';
import type { Campaign } from '../data/types';
import IntelligenceScreen from './IntelligenceScreen';
import FormsScreen from './FormsScreen';
import AnalyticsScreen from './AnalyticsScreen';
import SettingsScreen from './SettingsScreen';
import DataScreen from './DataScreen';
import { Shell } from '../shell/Shell';
import { store } from '../data/store';
import { SETUP_TASKS } from '../data/handoff';
import { TOTALS_30D } from '../data/workspaceTotals';

describe('Automations — canvas builder', () => {
  it('builds a flow from a trigger and blocks activation until every node is configured', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AutomationsScreen />);

    await user.click(screen.getByRole('button', { name: /New Loop/ }));
    await user.click(screen.getByText('Start from scratch'));

    // Empty canvas prompts for a trigger, and no steps can be added yet.
    expect(screen.getByText(/Start from a clean canvas/)).toBeInTheDocument();

    await user.click(screen.getByText('On-chain event'));
    // One unconfigured trigger => validation warns and Active stays disabled.
    expect(screen.getByText(/1 step needs setup/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Off/ })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Apply trigger/ }));
    expect(screen.getByText(/0 issues/)).toBeInTheDocument();
  });

  it('splits into If yes / If no paths when a Branch step is added', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AutomationsScreen />);

    await user.click(screen.getByRole('button', { name: /New Loop/ }));
    await user.click(screen.getByText('Start from scratch'));
    await user.click(screen.getByText('On-chain event'));
    await user.click(screen.getByText('Branch'));

    expect(screen.getByText('If yes')).toBeInTheDocument();
    expect(screen.getByText('If no')).toBeInTheDocument();
  });

  it('opens an Active automation read-only (pause to edit)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AutomationsScreen />);

    await user.click(screen.getByText('Welcome new wallets'));
    expect(screen.getByText(/Live\. Pause to edit/)).toBeInTheDocument();
  });
});

describe('Campaign wizard', () => {
  /* Telegram was removed from the product. Pinned at the two places a person would meet it:
     the channel picker, and the setup tasks that can be handed to someone else. */
  it('offers email, push and X — and no Telegram', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CampaignsScreen />);
    await user.click(screen.getByRole('button', { name: /Create campaign/ }));

    for (const name of [/^Email/, /^In-app push/, /^X DM/]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.queryByText(/telegram/i)).not.toBeInTheDocument();
    expect(SETUP_TASKS.map((t) => t.id)).toEqual(expect.not.arrayContaining(['telegram']));
  });

  it('recomputes reach when the channel changes and walks all three steps', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CampaignsScreen />);

    await user.click(screen.getByRole('button', { name: /Create campaign/ }));
    expect(screen.getByText('Who gets this?')).toBeInTheDocument();

    /* The headline is what will actually be sent, which is the segment reach minus the
       frequency budget and the holdout — so it is no longer the raw 2,720 the segments hold.
       Asserting the deductions here would copy the arithmetic out of the component; what
       this test is for is that the number tracks the channel. Email reach for these two
       segments is 1,680 + 1,040; push is 2,140 + 1,204, so push must come out higher. */
    const reach = () => Number(screen.getByText(/Estimated/).closest('div')!
      .querySelector('b')!.textContent!.replace(/,/g, ''));
    const onEmail = reach();
    expect(onEmail).toBeGreaterThan(0);

    await user.click(screen.getByText('In-app push'));
    expect(reach()).toBeGreaterThan(onEmail);

    await user.click(screen.getByRole('button', { name: /Continue/ }));
    expect(screen.getByText('What are you sending?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    expect(screen.getByText('Ready to send?')).toBeInTheDocument();
  });

  it('disables Continue when the audience selection is empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CampaignsScreen />);

    await user.click(screen.getByRole('button', { name: /Create campaign/ }));
    await user.click(screen.getByRole('button', { name: /^Clear$/ }));
    expect(screen.getByRole('button', { name: /Continue/ })).toBeDisabled();
  });
});

describe('Intelligence — chat → SQL → segment', () => {
  it('refuses out-of-scope questions instead of inventing an answer', async () => {
    const user = userEvent.setup();
    renderWithProviders(<IntelligenceScreen />);

    await user.type(screen.getByLabelText('Ask a question'), 'will ETH price go up next week?{Enter}');
    expect(screen.getByText(/I can't answer that one/)).toBeInTheDocument();
    expect(screen.getByText(/Try asking instead/)).toBeInTheDocument();
  });

  it('makes the generated SQL editable and flags unapplied edits', async () => {
    const user = userEvent.setup();
    renderWithProviders(<IntelligenceScreen />);

    await user.click(screen.getByText('Top holders by token'));
    await user.click(screen.getByRole('button', { name: /SQL/ }));

    const sql = screen.getByLabelText('SQL query');
    expect(sql).toBeInstanceOf(HTMLTextAreaElement);
    await user.type(sql, ' ');
    expect(screen.getByText(/Edited\. Re-run to apply/)).toBeInTheDocument();
  });

  it('carries the query into the segment draft when saving as a segment', async () => {
    const user = userEvent.setup();
    renderWithProviders(<IntelligenceScreen />);

    await user.click(screen.getByText('Top holders by token'));
    await user.click(screen.getByRole('button', { name: /Save as segment/ }));

    // The draft must reflect the query that produced it, not a blank default.
    expect(screen.getByText(/Built from your question/)).toBeInTheDocument();
    expect(screen.getByLabelText('Segment name')).toHaveValue('Top holders by token');
    expect(screen.getByDisplayValue('$VAULT')).toBeInTheDocument();
  });

  it('hands a preselected segment to the campaign wizard', async () => {
    const user = userEvent.setup();
    renderWithProviders(<IntelligenceScreen />);

    await user.click(screen.getByText('Top holders by token'));
    await user.click(screen.getByRole('button', { name: /Create campaign/ }));

    expect(screen.getByLabelText('Campaign name')).toHaveValue('Top holders by token');
    expect(screen.getByText('Who gets this?')).toBeInTheDocument();
  });
});

describe('Forms — 3-stage builder', () => {
  it('gates stage 2 until a template is chosen, then reaches the content builder', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FormsScreen />);

    await user.click(screen.getByRole('button', { name: /New form/ }));
    expect(screen.getByText('Select a style')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Save & next/ }));
    expect(screen.getByText('Select a template')).toBeInTheDocument();
    // No template picked yet — the gate holds.
    expect(screen.getByRole('button', { name: /Save & next/ })).toBeDisabled();

    await user.click(screen.getByText('Waitlist'));
    await user.click(screen.getByRole('button', { name: /Save & next/ }));
    expect(screen.getByText('Add a field')).toBeInTheDocument();
  });

  it('reports reachability from the fields actually on the form', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FormsScreen />);

    await user.click(await screen.findByText('Acme dapp connect'));
    await user.click(screen.getByRole('button', { name: 'Settings' }));

    const panel = screen.getByText('This form makes contacts').closest('div')!;
    expect(within(panel).getByText(/Email-reachable/)).toBeInTheDocument();
    expect(within(panel).getByText(/Push-reachable/)).toBeInTheDocument();
  });
});

describe('Automation performance chart', () => {
  // The bars used to be decoration — a fixed height ramp with the solid segment pinned at
  // 38% of every bar. These assert the two colours now carry the automation's own numbers.
  it('sums its entry bars back to the headline entry count', () => {
    const s = performanceSeries(1204, 38.2);
    expect(s.reduce((a, b) => a + b.entries, 0)).toBe(1204);
  });

  it('makes the completed share equal the headline completion rate', () => {
    const s = performanceSeries(1204, 38.2);
    const done = s.reduce((a, b) => a + b.completed, 0);
    expect(done).toBe(Math.round(1204 * 0.382));
    expect((done / 1204) * 100).toBeCloseTo(38.2, 1);
  });

  it('never draws more completions than entries in a period', () => {
    // A solid segment taller than its own bar would be nonsense.
    for (const row of [[1204, 38.2], [86, 61.6], [978, 12.4]] as const) {
      for (const b of performanceSeries(row[0], row[1])) {
        expect(b.completed).toBeLessThanOrEqual(b.entries);
        expect(b.completed).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('holds for a low-volume automation, where rounding drift would show', () => {
    const s = performanceSeries(86, 61.6);
    expect(s.reduce((a, b) => a + b.entries, 0)).toBe(86);
    expect(s.reduce((a, b) => a + b.completed, 0)).toBe(Math.round(86 * 0.616));
  });

  it('is deterministic, so the chart does not move between renders', () => {
    expect(performanceSeries(978, 12.4)).toEqual(performanceSeries(978, 12.4));
  });
});

describe('Per-message performance in a flow', () => {
  const WHALE = [
    { id: 'a', type: 'push', label: 'Push · “Before you go…”' },
    { id: 'b', type: 'wait', label: 'Wait 1 day' },
    { id: 'c', type: 'email', label: 'Email · “Better staking terms”' },
  ];

  it('lists only the message steps, in send order', () => {
    const m = flowMessageStats(86, 61.6, WHALE);
    expect(m.map((x) => x.kind)).toEqual(['push', 'email']);
  });

  it('measures each message against its own reach, not the entry count', () => {
    const m = flowMessageStats(86, 61.6, WHALE);
    // The push is first, so it reaches everyone; the email sits two steps deeper.
    expect(m[0].sent).toBe(86);
    expect(m[1].sent).toBeLessThan(m[0].sent);
  });

  it('never sends to more wallets than reached the step before', () => {
    const m = flowMessageStats(1204, 38.2, [
      { id: 'a', type: 'email', label: 'One' },
      { id: 'b', type: 'wait', label: 'Wait' },
      { id: 'c', type: 'email', label: 'Two' },
      { id: 'd', type: 'push', label: 'Three' },
    ]);
    for (let i = 1; i < m.length; i += 1) expect(m[i].sent).toBeLessThanOrEqual(m[i - 1].sent);
  });

  it('keeps the last message above the completion count — you cannot finish unseen', () => {
    const m = flowMessageStats(86, 61.6, WHALE);
    expect(m[m.length - 1].sent).toBeGreaterThanOrEqual(Math.round(86 * 0.616));
  });

  it('measures push clicks against views and email clicks against delivered', () => {
    const m = flowMessageStats(86, 61.6, WHALE);
    const push = m[0], email = m[1];
    expect(push.clicked).toBe(Math.round(push.engaged * 0.303));
    expect(email.clicked).toBe(Math.round(email.sent * 0.118));
  });

  it('returns nothing for a flow that sends no messages', () => {
    expect(flowMessageStats(1204, 38.2, [{ id: 'a', type: 'wait', label: 'Wait' }])).toEqual([]);
  });

  it('does not divide by zero on an automation with no entries', () => {
    expect(flowMessageStats(0, 0, WHALE)).toEqual([]);
  });
});

describe('Campaign performance by channel', () => {
  const mk = (over: Partial<Campaign>): Campaign => ({
    id: 'c', name: 'Test', channels: ['email'], type: 'Smart', status: 'sent',
    recipients: 3004, opened: 1054, clicked: 264, createdAt: 'Jul 15', ...over,
  });

  it('splits a multi-channel send without losing or inventing recipients', () => {
    const r = campaignChannelStats(mk({ channels: ['email', 'push'] }));
    expect(r).toHaveLength(2);
    // Smart routes each wallet to one channel, so the parts are exclusive and sum to the whole.
    expect(r.reduce((a, b) => a + b.sent, 0)).toBe(3004);
  });

  it('keeps the split totals equal to the campaign headline figures', () => {
    const c = mk({ channels: ['email', 'push'] });
    const r = campaignChannelStats(c);
    expect(r.reduce((a, b) => a + b.engaged, 0)).toBe(c.opened);
    expect(r.reduce((a, b) => a + b.clicked, 0)).toBe(c.clicked);
  });

  it('shows push being seen more often than email is opened', () => {
    const r = campaignChannelStats(mk({ channels: ['email', 'push'] }));
    const email = r.find((x) => x.kind === 'email')!;
    const push = r.find((x) => x.kind === 'push')!;
    // The blended number hid exactly this — it moved with the channel mix, not performance.
    expect(push.engagedRate).toBeGreaterThan(email.engagedRate);
  });

  it('gives a single-channel send the whole audience', () => {
    const r = campaignChannelStats(mk({ channels: ['push'], recipients: 86, opened: 54, clicked: 21 }));
    expect(r).toHaveLength(1);
    expect(r[0].kind).toBe('push');
    expect(r[0].sent).toBe(86);
    expect(r[0].engaged).toBe(54);
  });

  it('returns nothing for a campaign that has not sent', () => {
    expect(campaignChannelStats(mk({ status: 'draft', recipients: 0, opened: 0, clicked: 0 }))).toEqual([]);
  });
});

describe('Campaign detail page', () => {
  const mk = (over: Partial<Campaign>): Campaign => ({
    id: 'c', name: 'Test', channels: ['email'], type: 'Smart', status: 'sent',
    recipients: 3004, opened: 1054, clicked: 264, createdAt: 'Jul 15', ...over,
  });

  it('opens a campaign as a full page, not a drawer', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CampaignsScreen />);

    await user.click(await screen.findByText('Gas rebate week'));
    // The back affordance is the tell: a page you navigate out of, like an automation.
    expect(screen.getByRole('button', { name: /Campaigns/ })).toBeInTheDocument();
    expect(screen.getByText('Performance by channel')).toBeInTheDocument();
    expect(screen.getByText('Recent activity')).toBeInTheDocument();
    expect(screen.getByText('Compared with previous campaigns')).toBeInTheDocument();
  });

  it('goes back to the list', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CampaignsScreen />);

    await user.click(await screen.findByText('Gas rebate week'));
    await user.click(screen.getByRole('button', { name: /Campaigns/ }));
    expect(screen.getByRole('button', { name: /Create campaign/ })).toBeInTheDocument();
  });

  it('keeps the activity verb consistent with the channel it came from', () => {
    // "Opened · Push" and "Viewed · Email" are both nonsense; a push can't hard-bounce.
    for (const c of [mk({ channels: ['email', 'push'] }), mk({ channels: ['push'] }), mk({ channels: ['email'] })]) {
      for (const a of campaignActivity(c)) {
        if (a.via === 'Push') expect(['Viewed', 'Clicked', 'Unsubscribed']).toContain(a.kind);
        else expect(['Opened', 'Clicked', 'Unsubscribed', 'Bounced']).toContain(a.kind);
      }
    }
  });

  it('shows no activity for a campaign that has not sent', () => {
    expect(campaignActivity(mk({ status: 'scheduled' }))).toEqual([]);
    expect(campaignActivity(mk({ status: 'draft', recipients: 0 }))).toEqual([]);
  });

  it('is deterministic, so the feed does not reshuffle between renders', () => {
    expect(campaignActivity(mk({}))).toEqual(campaignActivity(mk({})));
  });

  it('puts same-channel-mix campaigns first and flags the rest', () => {
    const cur = mk({ id: 'cur', channels: ['push'] });
    const all = [
      cur,
      mk({ id: 'email1', channels: ['email'] }),
      mk({ id: 'push1', channels: ['push'] }),
      mk({ id: 'both', channels: ['email', 'push'] }),
    ];
    const peers = comparableCampaigns(all, cur);
    // Push is viewed ~2x as often as email is opened, so an email-only peer is not a
    // fair comparison for a push-only send — it must not be the one the delta uses.
    expect(peers[0].id).toBe('push1');
    expect(peers[0].sameMix).toBe(true);
    expect(peers.filter((p) => p.id !== 'push1').every((p) => p.sameMix === false)).toBe(true);
  });

  it('treats channel order as irrelevant to the mix', () => {
    const cur = mk({ id: 'cur', channels: ['push', 'email'] });
    const peers = comparableCampaigns([cur, mk({ id: 'x', channels: ['email', 'push'] })], cur);
    expect(peers[0].sameMix).toBe(true);
  });

  it('never compares a campaign against itself, or against unsent ones', () => {
    const all = [mk({ id: 'a' }), mk({ id: 'b' }), mk({ id: 'c2', status: 'draft', recipients: 0, opened: 0 })];
    const peers = comparableCampaigns(all, all[0]);
    expect(peers.map((p) => p.id)).toEqual(['b']);
  });
});

describe('Shell chrome', () => {
  it('makes the Home crumb a real link — it is the reflex for going back', () => {
    renderWithProviders(<Shell />, { route: '/analytics' });
    // The sidebar arrow collapses the nav rather than navigating, so this has to work.
    // Scoped to the breadcrumb: the sidebar's first destination is also called Home.
    const crumb = within(screen.getByLabelText('Breadcrumb'));
    expect(crumb.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });

  it('describes the sidebar control by what it does, not as a back arrow', () => {
    renderWithProviders(<Shell />, { route: '/analytics' });
    expect(screen.getByRole('button', { name: /Collapse sidebar/ })).toBeInTheDocument();
  });
});

describe('Analytics', () => {

  /* Each dashboard is its own address now, so the screen has to be mounted under the route
     that gives it one — rendered bare, useParams is empty and it shows the index instead. */
  const renderDash = (dash = 'overview') =>
    renderWithProviders(<AnalyticsScreen />, { route: `/analytics/${dash}`, path: '/analytics/:dash' });

  /* The dashboard is tabbed: only the active section renders, which is the point of tabs.
     These three charts answer "are people reading them", so they live under Engagement. */
  const openEngagement = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('link', { name: /^Engagement$/ }));
  };

  it('names every bar as a rate and spells out CTR', async () => {
    const user = userEvent.setup();
    renderDash();
    await openEngagement(user);

    /* "Email opens · 42.3%" read as a count. Each row is a rate, so each label says so.
       The row used to be called "Click-through rate (CTR)" here and "Click rate" on the
       Campaigns screen — one measure, two names, and the acronym was the only one that
       needed a gloss. One name now; the denominator still travels with it, which is the
       part that was actually ambiguous. */
    expect(screen.getByText('Email open rate')).toBeInTheDocument();
    expect(screen.getByText('Click rate')).toBeInTheDocument();
    expect(screen.queryByText('Email opens')).not.toBeInTheDocument();
    expect(screen.queryByText('Email clicks')).not.toBeInTheDocument();
  });

  it('states the denominator for CTR, which is genuinely ambiguous in email tooling', async () => {
    const user = userEvent.setup();
    renderDash();
    await openEngagement(user);
    // Clicks ÷ delivered, not clicks ÷ opens — the tooltip has to say which.
    expect(screen.getByLabelText(/Share of delivered emails where someone clicked/)).toBeInTheDocument();
  });

  it('labels what each bar colour means', async () => {
    const user = userEvent.setup();
    renderDash();
    await openEngagement(user);
    expect(screen.getByText(/Messaging · % of delivered/)).toBeInTheDocument();
    expect(screen.getByText(/Wallet activity · on-chain/)).toBeInTheDocument();
  });

  /* One range per dashboard: the Overview had five pickers, one per card, and nothing said
     whether the numbers on screen covered the same window. */
  it('has one date range for the whole dashboard, and the Headline and lanes move with it', async () => {
    const user = userEvent.setup();
    renderDash('overview');
    expect(screen.getAllByLabelText('Date range')).toHaveLength(1);

    await user.selectOptions(screen.getByLabelText('Date range'), '7d');
    const week = Math.round(TOTALS_30D.productEvents * 0.28).toLocaleString('en-US');
    // The Headline's in-app actions and the Product lane are the same measure, so they agree.
    expect(screen.getAllByText(week)).toHaveLength(2);
    expect(screen.getByText('in-app events · last 7 days')).toBeInTheDocument();
  });

  it('rescales the KPIs when the date range changes', async () => {
    const user = userEvent.setup();
    renderDash();

    // Wallets reached, from the workspace totals every screen shares.
    const thirty = TOTALS_30D.walletsReached.toLocaleString('en-US');
    expect(screen.getByText(thirty)).toBeInTheDocument();
    // The page-level range control moved onto the headline strip and became a native select
    // when each chart took ownership of its own window. The behaviour under test is unchanged:
    // the control drives the numbers.
    await user.selectOptions(screen.getAllByLabelText('Date range')[0], '7d');

    // 30-day figure x 0.28: the control drives the data rather than decorating it.
    expect(screen.getByText(Math.round(TOTALS_30D.walletsReached * 0.28).toLocaleString('en-US'))).toBeInTheDocument();
    expect(screen.queryByText(thirty)).not.toBeInTheDocument();
  });

  /* The Reports menu offered six named reports that all opened the same two bar charts already
     on Engagement, with an export identical to Export. Sharing the numbers is Publish and
     Export, and nothing else in the header promises a view it does not have. */
  it('offers Publish and Export in the header, and no Reports menu', () => {
    renderDash();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reports/ })).not.toBeInTheDocument();
  });
});

describe('Settings', () => {
  it('edits and saves a profile field', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsScreen />);

    await user.click(screen.getByRole('button', { name: /^Edit$/ }));
    const name = screen.getByLabelText('Full name');
    await user.clear(name);
    await user.type(name, 'Ada Lovelace');
    await user.click(screen.getByRole('button', { name: /Save changes/ }));

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument();
  });

  it('keeps the manual form, and its address validation, one click away', async () => {
    const user = userEvent.setup();
    // Contracts live on Data → Events; Settings had a second copy of this dialog and it went.
    // The dialog leads with one paste-anything box, but resolution against a real chain fails
    // for real reasons, so the hand-entry path has to survive — along with its check.
    renderWithProviders(<DataScreen />);

    await user.click(screen.getByRole('button', { name: /^Events$/ }));
    await user.click(screen.getByRole('button', { name: /Add contract/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /by hand/ }));

    const dialog = within(screen.getByRole('dialog'));
    // A name the seeded list does not already use, so the final assertion means "this row
    // was added" rather than "a row with this name exists".
    await user.type(dialog.getByLabelText('Contract name'), 'Season 3 Passes');
    await user.type(dialog.getByLabelText('Contract address'), '0xnope');
    // Specific, instructive error — never "Invalid input".
    expect(dialog.getByText(/must be 42 characters starting with 0x/)).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: /^Index contract$/ })).toBeDisabled();

    // A well-formed address unlocks it and the contract lands in the table.
    await user.clear(dialog.getByLabelText('Contract address'));
    await user.type(dialog.getByLabelText('Contract address'), '0x3F4a0912CdEf34567890aBcDeF12345678908a21');
    await user.click(dialog.getByRole('button', { name: /^Index contract$/ }));
    expect(screen.getByText('Season 3 Passes')).toBeInTheDocument();
  });

  it('resolves one pasted address into contracts you tick, never asking for an ABI', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DataScreen />);

    await user.click(screen.getByRole('button', { name: /^Events$/ }));
    await user.click(screen.getByRole('button', { name: /Add contract/ }));
    const dialog = within(screen.getByRole('dialog'));

    // The box says what it thinks you pasted before you commit to anything, and it must not
    // claim to know whether a 40-hex string is a contract or a wallet.
    const box = dialog.getByLabelText(/Contract address, link, website, symbol or ABI/);
    await user.type(box, '0x1A2b3C4d5E6f7A8b9C0d1E2f3A4b5C6d7E8f9F3e');
    expect(dialog.getByText('An address.')).toBeInTheDocument();

    await user.click(dialog.getByRole('button', { name: /Look it up/ }));
    // That address is a deployer in the mock: the answer is a list, not a single contract.
    expect(await dialog.findByText(/That is a wallet, not a contract/)).toBeInTheDocument();

    // Nothing is pre-ticked, so a test deployment cannot slip into the audience unnoticed.
    expect(dialog.getByRole('button', { name: /^Index contract$/ })).toBeDisabled();
    const boxes = dialog.getAllByRole('checkbox');
    expect(boxes.every((b) => !(b as HTMLInputElement).checked)).toBe(true);

    // Each row names itself on its checkbox, so the assertion does not depend on the mock's
    // seeded contract names.
    const name = (boxes[0].getAttribute('aria-label') ?? '').replace(/^Index /, '');
    expect(name.length).toBeGreaterThan(0);
    await user.click(boxes[0]);
    await user.click(dialog.getByRole('button', { name: /^Index contract$/ }));
    expect(screen.getByText(name)).toBeInTheDocument();
  });

  it('enables two-factor authentication only after a 6-digit code', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsScreen />);

    await user.click(screen.getByRole('button', { name: /Set up 2FA/ }));
    expect(screen.getByRole('button', { name: /Enable 2FA/ })).toBeDisabled();

    await user.type(screen.getByLabelText('6-digit code'), '123456');
    await user.click(screen.getByRole('button', { name: /Enable 2FA/ }));

    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });
});

/* Push has its own setup gate, so tests that mean to exercise an *email* gate must satisfy
   it first — otherwise a blocked push send proves nothing about DKIM/SPF or the footer. */
const connectPush = () => {
  store.startPushInstall('app.acme.com');
  store.checkPushInstall();
  store.checkPushInstall();
};

describe('Sender domain verification', () => {
  beforeEach(() => { store.removeDomain(); });

  it('publishes copyable DKIM and SPF records, then verifies once both resolve', async () => {
    const user = userEvent.setup();
    /* The panel lives in Integrations → Channels → Email. It used to be rendered on first
       run as well, and this test reached for it there; that was the convenient host, never
       the real one. Verification needs registrar access and propagates on its own schedule,
       so it no longer stands in front of the product. */
    renderWithProviders(<DataScreen />);
    await user.click(screen.getByRole('button', { name: /^Channels$/ }));
    // Channels lists every channel's state first; a setup panel opens from its row.
    await user.click(screen.getByRole('button', { name: /^Email/ }));

    await user.type(screen.getByLabelText('Sending domain'), 'mail.acme.com');
    await user.click(screen.getByRole('button', { name: /Generate DNS records/ }));

    // Both records are shown for the user to copy into their registrar.
    expect(screen.getByText('DKIM')).toBeInTheDocument();
    expect(screen.getByText('SPF')).toBeInTheDocument();
    expect(screen.getByText(/mail\._domainkey\.mail\.acme\.com/)).toBeInTheDocument();
    expect(screen.getAllByText(/Pending DNS/).length).toBeGreaterThan(0);

    // DNS propagates unevenly: the first check finds DKIM, the second finds SPF.
    await user.click(screen.getByRole('button', { name: /Check records/ }));
    await screen.findByRole('button', { name: /Check records/ }, { timeout: 3000 });
    await user.click(screen.getByRole('button', { name: /Check records/ }));

    expect(await screen.findAllByText('Verified', { exact: false }, { timeout: 3000 })).not.toHaveLength(0);
  });

  it('blocks an email send until a domain is verified, and says why', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CampaignsScreen />);

    await user.click(screen.getByRole('button', { name: /Create campaign/ }));
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    expect(screen.getByText(/No verified sending domain/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Continue/ }));
    expect(screen.getByRole('button', { name: /^Send to/ })).toBeDisabled();
  });

  it('lets in-app push send without a verified domain', async () => {
    const user = userEvent.setup();
    connectPush();
    renderWithProviders(<CampaignsScreen />);

    await user.click(screen.getByRole('button', { name: /Create campaign/ }));
    await user.click(screen.getByText('In-app push'));
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    await user.click(screen.getByRole('button', { name: /Continue/ }));

    // Push doesn't depend on DKIM/SPF, so the email gate must not apply.
    expect(screen.getByRole('button', { name: /^(Send to|Queue for)/ })).toBeEnabled();
  });
});

describe('Push install gate', () => {
  beforeEach(() => { store.removePushInstall(); store.removeMobileInstall(); });

  it('publishes a copyable snippet, then connects once both handshakes land', async () => {
    const user = userEvent.setup();
    // Channels live on Integrations → Channels: every connection in and out.
    renderWithProviders(<DataScreen />);

    await user.click(screen.getByRole('button', { name: /^Channels$/ }));
    // Channels lists every channel's state first; a setup panel opens from its row.
    await user.click(screen.getByRole('button', { name: /^In-app push/ }));
    await user.type(screen.getByLabelText('dApp origin'), 'app.acme.com');
    await user.click(screen.getByRole('button', { name: /Generate install snippet/ }));

    expect(screen.getByText(/cdn\.onchainsuite\.xyz\/sdk\/v1\.js/)).toBeInTheDocument();
    expect(screen.getAllByText(/Awaiting SDK/).length).toBeGreaterThan(0);

    // The script reports first; a wallet only lands once someone actually connects.
    await user.click(screen.getByRole('button', { name: /Check connection/ }));
    await screen.findByRole('button', { name: /Check connection/ }, { timeout: 3000 });
    await user.click(screen.getByRole('button', { name: /Check connection/ }));

    expect(await screen.findAllByText('Connected', { exact: false }, { timeout: 3000 })).not.toHaveLength(0);
  });

  it('blocks a push send until the SDK is connected, and says why', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CampaignsScreen />);

    await user.click(screen.getByRole('button', { name: /Create campaign/ }));
    await user.click(screen.getByText('In-app push'));
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    await user.click(screen.getByRole('button', { name: /Continue/ }));

    expect(screen.getByText(/can’t send until the SDK is installed/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^(Send to|Queue for)/ })).toBeDisabled();
  });

  it('gates the mobile surface on its own install, not the web one', async () => {
    const user = userEvent.setup();
    connectPush();               // web is fully connected…
    store.removeMobileInstall(); // …but mobile is not, and mobile is what we pick.
    renderWithProviders(<CampaignsScreen />);

    await user.click(screen.getByRole('button', { name: /Create campaign/ }));
    await user.click(screen.getByText('In-app push'));
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    await user.click(screen.getByRole('button', { name: /Mobile push/ }));
    await user.click(screen.getByRole('button', { name: /Continue/ }));

    expect(screen.getByText(/until the mobile SDK is set up/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^(Send to|Queue for)/ })).toBeDisabled();
  });

  it('blocks mobile with a credential but no registered device, and says which', async () => {
    const user = userEvent.setup();
    store.startMobileInstall('com.acme.app');
    store.setMobileCredential('apns', true);
    renderWithProviders(<CampaignsScreen />);

    await user.click(screen.getByRole('button', { name: /Create campaign/ }));
    await user.click(screen.getByText('In-app push'));
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    await user.click(screen.getByRole('button', { name: /Mobile push/ }));
    await user.click(screen.getByRole('button', { name: /Continue/ }));

    expect(screen.getByText(/No device has registered/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^(Send to|Queue for)/ })).toBeDisabled();
  });

  it('cannot register a device before a store credential exists', () => {
    store.startMobileInstall('com.acme.app');
    store.checkMobileInstall();
    // No APNs/FCM key, so there is nothing for a token to be signed against.
    expect(store.getState().mobile.tokenSeen).toBe(false);
    expect(store.getState().mobile.status).toBe('pending');
  });

  it('connects mobile on one platform alone', () => {
    store.startMobileInstall('com.acme.app');
    store.setMobileCredential('fcm', true);
    store.checkMobileInstall();
    // Android-only is a real shipping choice; requiring both would be wrong.
    expect(store.getState().mobile.status).toBe('connected');
  });

  it('still blocks when the SDK is live but has never reported a wallet', async () => {
    const user = userEvent.setup();
    // Script handshake only. A queue with nobody to drain into delivers to nobody.
    store.startPushInstall('app.acme.com');
    store.checkPushInstall();
    renderWithProviders(<CampaignsScreen />);

    await user.click(screen.getByRole('button', { name: /Create campaign/ }));
    await user.click(screen.getByText('In-app push'));
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    await user.click(screen.getByRole('button', { name: /Continue/ }));

    expect(screen.getByText(/hasn’t reported a connected wallet yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^(Send to|Queue for)/ })).toBeDisabled();
  });
});

describe('Footer compliance gate', () => {
  /* A verified domain isolates this from the sender-domain gate, so a blocked send here can
     only be caused by the footer. */
  const verifyDomain = () => {
    store.startDomainVerification('mail.acme.com');
    store.checkDomain();
    store.checkDomain();
  };

  it('allows the send when the footer carries every required tag', async () => {
    const user = userEvent.setup();
    verifyDomain();
    renderWithProviders(<CampaignsScreen />);

    await user.click(screen.getByRole('button', { name: /Create campaign/ }));
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    await user.click(screen.getByRole('button', { name: /Continue/ }));

    expect(screen.getByRole('button', { name: /^Send to/ })).toBeEnabled();
  });

  it('blocks the send and names the tags when the footer is stripped', async () => {
    const user = userEvent.setup();
    verifyDomain();
    renderWithProviders(<CampaignsScreen />);

    await user.click(screen.getByRole('button', { name: /Create campaign/ }));
    await user.click(screen.getByRole('button', { name: /Continue/ }));

    // Strip the footer's merge tags in the editor.
    await user.click(screen.getByRole('button', { name: /Open in editor/ }));
    await user.click(screen.getByText(/You’re receiving this because you opted in/));
    await user.click(screen.getByRole('button', { name: 'Inspect' }));
    await user.clear(screen.getByLabelText('Content'));
    await user.type(screen.getByLabelText('Content'), 'no tags here');
    expect(screen.getByText(/3 required tags missing/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Back to campaign/ }));

    await user.click(screen.getByRole('button', { name: /Continue/ }));
    expect(screen.getByText(/its footer is missing/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Send to/ })).toBeDisabled();
  });

  it('does not block in-app push, which has no footer requirement', async () => {
    const user = userEvent.setup();
    store.removeDomain();
    connectPush();
    renderWithProviders(<CampaignsScreen />);

    await user.click(screen.getByRole('button', { name: /Create campaign/ }));
    await user.click(screen.getByText('In-app push'));
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    await user.click(screen.getByRole('button', { name: /Continue/ }));

    expect(screen.getByRole('button', { name: /^(Send to|Queue for)/ })).toBeEnabled();
  });
});
