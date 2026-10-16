import type { IconName } from '../components/icons';
import { useWalletSync } from '../components/WalletSync';
import { usePublishedByMe } from './published';
import { useContracts, useLists, useSender, usePushInstall, useMobileInstall } from './store';

/* Getting started.
 *
 * Every step is read from state the product already keeps, never from a "has seen" flag. A
 * checklist that ticks because you visited a screen teaches people to click through it; one
 * that ticks because a contract is indexed is telling them something true about their
 * workspace, and it un-ticks if they remove the contract.
 *
 * Six, in the order the product actually needs them: nothing works without a contract,
 * nothing is worth looking at until the wallets are enriched, and nothing can be sent until a
 * channel is live.
 */
export interface SetupStep {
  id: string;
  label: string;
  /** What to do, shown while the step is open and unticked. */
  hint: string;
  icon: IconName;
  to: string;
  done: boolean;
}

export function useSetupSteps(): SetupStep[] {
  const contracts = useContracts();
  const sync = useWalletSync();
  const sender = useSender();
  const push = usePushInstall();
  const mobile = useMobileInstall();
  const lists = useLists();
  const published = usePublishedByMe();

  return [
    {
      id: 'contract', label: 'Index a contract', icon: 'network', to: '/integrations',
      hint: 'Paste an address, a deployer wallet or your website. Everything behavioural starts here.',
      done: contracts.length > 0,
    },
    {
      id: 'enrich', label: 'Sync your wallets', icon: 'users', to: '/audience',
      hint: 'Read the holder list and pull per-wallet metrics, so segments have something to match on.',
      done: sync !== null,
    },
    {
      id: 'domain', label: 'Verify a sending domain', icon: 'mail', to: '/integrations',
      hint: 'Two DNS records, so mail leaves as you rather than as us. Email cannot send until it resolves.',
      done: sender.status === 'verified',
    },
    {
      id: 'push', label: 'Install in-app push', icon: 'smartphone', to: '/integrations',
      hint: 'The SDK in your dApp. Push reaches people who never gave you an email address.',
      done: push.status === 'connected' || mobile.status === 'connected',
    },
    {
      id: 'list', label: 'Build an audience', icon: 'list', to: '/audience',
      hint: 'A list or a segment: the thing a campaign is sent to.',
      /* The seeded lists do not count: a checklist that starts half-ticked on demo data is
         congratulating the operator for work the fixtures did. */
      done: lists.some((l) => l.source !== 'Manual · empty' && !l.id.startsWith('seed')) && lists.length > 3,
    },
    {
      id: 'share', label: 'Publish a dashboard', icon: 'globe', to: '/analytics',
      hint: 'A link your team can read without an account, so the numbers leave this browser.',
      done: published.length > 0,
    },
  ];
}

/* The line under the count. Attio changes theirs as you go and it is the only part of the
 * panel that is purely encouragement — worth keeping short and worth stopping entirely once
 * there is nothing left to do. */
export function setupNudge(done: number, total: number): string {
  if (done === 0) return 'Let’s go!';
  if (done >= total) return 'All done.';
  if (done >= total - 1) return 'Almost there!';
  return 'Keep it up!';
}
