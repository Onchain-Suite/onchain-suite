// A tiny reactive store for mutable client state (audience CRUD + onboarding), built on
// useSyncExternalStore. In production this would be React Query mutations against the API.
import { useMemo, useSyncExternalStore } from 'react';
import { CONTACTS, LISTS, SEGMENTS, SUPPRESSIONS, TAGS, listCount, tagCount } from './mock';
import { loadPersisted, savePersisted } from './persist';
import type { AudienceList, Contact, Segment, Suppression, Tag } from './types';
import type { HandoffChannel } from './handoff';
import { DEFAULT_HOLDOUT, type HoldoutPolicy } from './experiment';

/** A sending domain and the DNS records that must resolve before branded email can send. */
export interface SenderDomain {
  domain: string;
  /** 'pending' = records published for the user to add; 'verified' = both resolve. */
  status: 'none' | 'pending' | 'verified';
  dkimVerified: boolean;
  spfVerified: boolean;
}

/** The dApp origin running the push SDK, and the two handshakes that must land before
 *  in-app push can send. Email's gate is DKIM + SPF; push's is script + wallet. */
export interface PushInstall {
  /** The origin the SDK is allowed to run on, e.g. app.acme.com. */
  origin: string;
  /** 'pending' = snippet issued, waiting on a handshake; 'connected' = both signals in. */
  status: 'none' | 'pending' | 'connected';
  /** The SDK loaded on that origin and authenticated with the publishable key. */
  sdkSeen: boolean;
  /** A connected wallet was reported. Without this there is nobody to enqueue a push for. */
  walletSeen: boolean;
}

/** Mobile push is a different product, not the web SDK with a flag.
 *
 *  The OS owns delivery, so it needs a signing credential per store — APNs for Apple, FCM
 *  for Google — and you can ship one platform without the other. It also needs something
 *  web never does: the user has to *grant permission*, and a device token only exists once
 *  they do. So the gate is "at least one credential" AND "a real device registered",
 *  rather than the web SDK's flat two-signal AND. */
export interface MobilePushInstall {
  /** The app's bundle identifier, e.g. com.acme.app. */
  bundleId: string;
  status: 'none' | 'pending' | 'connected';
  /** Apple Push Notification service key uploaded and accepted. */
  apns: boolean;
  /** Firebase Cloud Messaging service account uploaded and accepted. */
  fcm: boolean;
  /** A device granted notification permission and registered a token against a wallet. */
  tokenSeen: boolean;
}

/* X (Twitter) app authorisation (2.5).
 *
 * The constraint is the platform's, not ours: the DM endpoint rejects any recipient who
 * does not follow the authenticated account or has not DM'd it first. No API tier changes
 * that. So `followers` is not a stat — it is the ceiling on reach, and the audience picker
 * discounts against it rather than showing segment size. */
export interface XInstall {
  /** The authenticated account, e.g. acme. */
  handle: string;
  status: 'none' | 'pending' | 'connected';
  /** OAuth completed with dm.write scope granted. */
  authorized: boolean;
  /** Followers whose wallet is linked — the only people a DM can actually reach. */
  reachableFollowers: number;
  /** A poll has run at least once. */
  checked: boolean;
}

/* Developer API.
 *
 * Secret keys are shown exactly once, at creation, and only a prefix is retained. That is
 * not decoration — a dashboard that can re-display a secret is a dashboard that stores it
 * recoverably, and the backend must mirror this: hash on receipt, never persist the plaintext. */
export interface ApiKey {
  id: string;
  name: string;
  /** The visible stub, e.g. "sk_live_9f2a…". The remainder is never stored. */
  prefix: string;
  created: string;
  lastUsed: string | null;
  scope: 'read' | 'write';
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
}

/* Global frequency budget (2.5).
 *
 * Suppression is per-channel, which was fine when there were two channels and most
 * contacts were only reachable on one. With three, the same person can be emailed, pushed
 * and DM'd on X inside an hour — each channel individually within its limits, all three
 * together indistinguishable from spam. The budget is deliberately
 * counted across channels, not per channel: it is a cap on how often a *person* hears from
 * you, which is the thing they actually experience. */
export interface FrequencyBudget {
  enabled: boolean;
  /** Total messages one contact may receive in a rolling 7 days, across every channel. */
  maxPerWeek: number;
  /** Minimum gap between any two messages to the same contact. */
  minHoursBetween: number;
  /** Transactional sends (receipts, security, 2FA) are never rationed. */
  exemptTransactional: boolean;
}

/** A channel's setup state, flattened to the one question the operator cares about:
 *  can I send on this right now, and if not, what is missing? */
export interface ChannelReadiness {
  id: 'email' | 'push' | 'x';
  label: string;
  status: 'connected' | 'pending' | 'none';
  /** What is blocking, in the operator's words. Null when connected. */
  blocker: string | null;
  /** Where to go to fix it. */
  to: string;
}

/* A setup handoff — instructions sent to whoever actually holds the credentials.
 *
 * One record, not one per channel: the whole point is that the evaluator sends a single
 * message rather than chasing five. Channels drop off it as they connect, so it shrinks
 * on its own and never has to be manually reconciled. */
export interface Handoff {
  /** Who the instructions went to. Empty string when nothing has been sent. */
  email: string;
  /** Channels the message covered. */
  channels: HandoffChannel[];
  /** Display timestamp, null when never sent. */
  sentAt: string | null;
  /** How many times it has been sent to this address — a resend is a nudge, and the
   *  count is the honest thing to show rather than pretending each one is the first. */
  sends: number;
}

/** A contract the workspace indexes. Everything behavioural the product does starts here. */
export interface IndexedContract {
  name: string; address: string; chain: string; kind: string;
  activities: string[]; holders: number;
}

interface State {
  /* Segments saved from a query.
   *
   * These lived in the Intelligence screen's own component state, and a comment above them
   * claimed Segments was "the shared source of truth the campaign wizard reads". It was not:
   * every other consumer read the seeded list, so "save as segment" then "build a campaign on
   * it" was a dead end, and the tab badge counted the seeds while ignoring what you had just
   * made. Shared state in a private copy, with a comment asserting the opposite. */
  segments: Segment[];
  /* Contracts used to be local state inside the Data screen, which meant nothing else could
     see them — not the setup checklist, not Home, not a guard on "you have no triggers yet".
     The single most important input in the product was invisible to the rest of it. */
  contracts: IndexedContract[];
  lists: AudienceList[];
  tags: Tag[];
  suppressions: Suppression[];
  onboarded: boolean;
  sender: SenderDomain;
  push: PushInstall;
  mobile: MobilePushInstall;
  apiKeys: ApiKey[];
  webhooks: Webhook[];
  frequency: FrequencyBudget;
  x: XInstall;
  handoff: Handoff;
  holdout: HoldoutPolicy;
}

const ONBOARD_KEY = 'os-onboarded';

/* What the demo workspace starts with, for every field an empty workspace clears. One
   definition, used both to load the app and to bring the demo back as the picture of a
   workspace in use — two copies of the seed would drift. */
function workspaceSeed() {
  return {
    segments: [] as Segment[],
    contracts: [
      { name: 'Acme Packs', address: '0x1A2b3C4d5E6f7A8b9C0d1E2f3A4b5C6d7E8f9F3e', chain: 'Base', kind: 'ERC-721', activities: ['Mint', 'Transfer'], holders: 3496 },
      { name: 'Acme Staking', address: '0x8Cc47712bF3A0d2eE291B7A5C41f9E88Dd0121aB', chain: 'Base', kind: 'Vault', activities: ['Stake', 'Unstake'], holders: 610 },
    ] as IndexedContract[],
    lists: [...LISTS] as AudienceList[],
    tags: [...TAGS] as Tag[],
    suppressions: [...SUPPRESSIONS] as Suppression[],
    sender: { domain: '', status: 'none', dkimVerified: false, spfVerified: false } as SenderDomain,
    push: { origin: '', status: 'none', sdkSeen: false, walletSeen: false } as PushInstall,
    mobile: { bundleId: '', status: 'none', apns: false, fcm: false, tokenSeen: false } as MobilePushInstall,
    apiKeys: [
      { id: 'k1', name: 'Production server', prefix: 'sk_live_9f2a', created: 'Jul 12, 2026', lastUsed: '4 min ago', scope: 'write' },
    ] as ApiKey[],
    webhooks: [] as Webhook[],
    x: { handle: '', status: 'none', authorized: false, reachableFollowers: 0, checked: false } as XInstall,
  };
}

const SEED = workspaceSeed();

let state: State = {
  segments: loadPersisted<Segment[]>('segments', SEED.segments),
  contracts: loadPersisted<IndexedContract[]>('contracts', SEED.contracts),
  lists: loadPersisted('lists', SEED.lists),
  tags: loadPersisted('tags', SEED.tags),
  suppressions: loadPersisted('suppressions', SEED.suppressions),
  onboarded: (() => {
    try {
      return localStorage.getItem(ONBOARD_KEY) === '1';
    } catch {
      return false;
    }
  })(),
  sender: loadPersisted<SenderDomain>('sender', SEED.sender),
  push: loadPersisted<PushInstall>('push', SEED.push),
  mobile: loadPersisted<MobilePushInstall>('mobile', SEED.mobile),
  apiKeys: loadPersisted<ApiKey[]>('apiKeys', SEED.apiKeys),
  webhooks: loadPersisted<Webhook[]>('webhooks', SEED.webhooks),
  frequency: loadPersisted<FrequencyBudget>('frequency', {
    enabled: true, maxPerWeek: 3, minHoursBetween: 10, exemptTransactional: true,
  }),
  x: loadPersisted<XInstall>('x', SEED.x),
  handoff: loadPersisted<Handoff>('handoff', { email: '', channels: [], sentAt: null, sends: 0 }),
  holdout: loadPersisted<HoldoutPolicy>('holdout', DEFAULT_HOLDOUT),
};

/** Mobile is ready when at least one store credential is live AND a device has registered.
 *  Credentials alone prove nothing: without a granted permission there is no token to send to. */
export const mobileConnected = (m: Pick<MobilePushInstall, 'apns' | 'fcm' | 'tokenSeen'>) =>
  (m.apns || m.fcm) && m.tokenSeen;

const listeners = new Set<() => void>();
function emit() {
  state = { ...state };
  savePersisted('lists', state.lists);
  savePersisted('tags', state.tags);
  savePersisted('suppressions', state.suppressions);
  savePersisted('sender', state.sender);
  savePersisted('push', state.push);
  savePersisted('mobile', state.mobile);
  savePersisted('apiKeys', state.apiKeys);
  savePersisted('webhooks', state.webhooks);
  savePersisted('frequency', state.frequency);
  savePersisted('x', state.x);
  savePersisted('handoff', state.handoff);
  savePersisted('holdout', state.holdout);
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const store = {
  getState: () => state,
  /** `source` describes where the list came from — an import supplies its own, so a list
   *  built from a CSV doesn't sit in the table claiming to be manual and empty. */
  saveSegment(seg: Segment) {
    state.segments = [seg, ...state.segments.filter((s) => s.id !== seg.id)];
    savePersisted('segments', state.segments);
    emit();
  },
  /* A workspace that has paid and nothing else. Onboarding no longer indexes anything before
     payment, so the first thing a new customer sees has to be genuinely empty — the seeded
     demo would otherwise be presented as their contracts, their lists, their sends.
     Keys and webhooks go too: they belong to the demo workspace, not this one. */
  emptyWorkspace({ keepSender = false }: { keepSender?: boolean } = {}) {
    state.contracts = [];
    state.segments = [];
    state.lists = [];
    state.tags = [];
    state.suppressions = [];
    // A sending domain set up during onboarding belongs to this workspace, not the demo.
    if (!keepSender) state.sender = { domain: '', status: 'none', dkimVerified: false, spfVerified: false };
    state.push = { origin: '', status: 'none', sdkSeen: false, walletSeen: false };
    state.mobile = { bundleId: '', status: 'none', apns: false, fcm: false, tokenSeen: false };
    state.x = { handle: '', status: 'none', authorized: false, reachableFollowers: 0, checked: false };
    state.apiKeys = [];
    state.webhooks = [];
    savePersisted('contracts', state.contracts);
    savePersisted('segments', state.segments);
    emit();
  },
  /** The demo workspace back, as the picture of one in use. */
  seedWorkspace() {
    /* What the person set up themselves stays: their sending domain and their contracts are
       theirs, and the demo filling in around them should not quietly replace either. */
    const { sender, contracts } = state;
    Object.assign(state, workspaceSeed());
    if (sender.status !== 'none') state.sender = sender;
    if (contracts.length) state.contracts = contracts;
    savePersisted('contracts', state.contracts);
    savePersisted('segments', state.segments);
    emit();
  },
  addContracts(list: IndexedContract[]) {
    state.contracts = [...state.contracts, ...list];
    savePersisted('contracts', state.contracts);
    emit();
  },
  addList(name: string, type: AudienceList['type'], source = 'Manual · empty') {
    const id = `list-${Date.now()}`;
    state.lists = [
      { id, name, source, type, reach: [], updated: 'just now' },
      ...state.lists,
    ];
    emit();
    return id;
  },
  /** Record an import against a list.
   *
   *  Choosing an existing destination used to do nothing at all — the modal closed and a
   *  toast claimed success while the store was untouched, so the list looked exactly as it
   *  had before. Only the create-new branch left a trace, which meant the two halves of
   *  one dialog disagreed about whether an import is an event that happened. */
  importInto(listId: string, count: number, source: string) {
    state.lists = state.lists.map((l) => (l.id === listId
      ? { ...l, source, updated: 'just now', reach: l.reach.length ? l.reach : (['email'] as AudienceList['reach']) }
      : l));
    emit();
    return count;
  },
  addTag(name: string, rule: Tag['rule']) {
    const id = `tag-${Date.now()}`;
    state.tags = [{ id, name, rule, updated: 'just now' }, ...state.tags];
    emit();
    return id;
  },
  reinstate(id: string) {
    state.suppressions = state.suppressions.filter((s) => s.id !== id);
    emit();
  },
  /** Publish the DNS records for a domain — the user must now add them at their registrar. */
  startDomainVerification(domain: string) {
    state.sender = { domain, status: 'pending', dkimVerified: false, spfVerified: false };
    emit();
  },
  /** Re-check DNS. Simulates the poll a real backend runs until both records resolve. */
  checkDomain() {
    const s = state.sender;
    if (s.status === 'none') return;
    // First check resolves DKIM, second resolves SPF — mirrors records propagating at different times.
    const dkim = true;
    const spf = s.dkimVerified;
    state.sender = { ...s, dkimVerified: dkim, spfVerified: spf, status: dkim && spf ? 'verified' : 'pending' };
    emit();
  },
  removeDomain() {
    state.sender = { domain: '', status: 'none', dkimVerified: false, spfVerified: false };
    emit();
  },
  /** Allowlist an origin and issue its snippet — the user must now install it in the dApp. */
  startPushInstall(origin: string) {
    state.push = { origin, status: 'pending', sdkSeen: false, walletSeen: false };
    emit();
  },
  /** Re-check for handshakes. The script reports first; a wallet only lands once someone
   *  actually connects on that origin, so the two signals arrive apart — same as DNS. */
  checkPushInstall() {
    const p = state.push;
    if (p.status === 'none') return;
    const sdk = true;
    const wallet = p.sdkSeen;
    state.push = { ...p, sdkSeen: sdk, walletSeen: wallet, status: sdk && wallet ? 'connected' : 'pending' };
    emit();
  },
  removePushInstall() {
    state.push = { origin: '', status: 'none', sdkSeen: false, walletSeen: false };
    emit();
  },
  /** Register the app's bundle id — credentials and a device token come next. */
  startMobileInstall(bundleId: string) {
    state.mobile = { bundleId, status: 'none', apns: false, fcm: false, tokenSeen: false };
    state.mobile.status = 'pending';
    emit();
  },
  /** Upload (or remove) a store credential. Either one alone is enough to ship a platform. */
  setMobileCredential(platform: 'apns' | 'fcm', on: boolean) {
    const m = state.mobile;
    if (m.status === 'none') return;
    const next = { ...m, [platform]: on };
    state.mobile = { ...next, status: mobileConnected(next) ? 'connected' : 'pending' };
    emit();
  },
  /** Re-check for a device token. Only ever lands after the user grants OS permission. */
  checkMobileInstall() {
    const m = state.mobile;
    if (m.status === 'none') return;
    // A token can't exist before a credential — the SDK has nothing to register against.
    if (!m.apns && !m.fcm) return;
    const next = { ...m, tokenSeen: true };
    state.mobile = { ...next, status: mobileConnected(next) ? 'connected' : 'pending' };
    emit();
  },
  /** Mint a key. Returns the full secret ONCE — the store keeps only the prefix. */
  createApiKey(name: string, scope: ApiKey['scope']) {
    const rand = (n: number) => {
      const b = new Uint8Array(n);
      (globalThis.crypto ?? { getRandomValues: (a: Uint8Array) => a.fill(7) }).getRandomValues(b);
      return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('').slice(0, n);
    };
    const body = rand(24);
    const secret = `sk_live_${body}`;
    const key: ApiKey = {
      id: `k-${body.slice(0, 6)}`,
      name: name.trim() || 'Untitled key',
      prefix: secret.slice(0, 12),
      created: 'just now',
      lastUsed: null,
      scope,
    };
    state.apiKeys = [key, ...state.apiKeys];
    emit();
    return secret;
  },
  revokeApiKey(id: string) {
    state.apiKeys = state.apiKeys.filter((k) => k.id !== id);
    emit();
  },
  addWebhook(url: string, events: string[]) {
    state.webhooks = [{ id: `w-${state.webhooks.length + 1}-${url.length}`, url, events, active: true }, ...state.webhooks];
    emit();
  },
  toggleWebhook(id: string) {
    state.webhooks = state.webhooks.map((w) => (w.id === id ? { ...w, active: !w.active } : w));
    emit();
  },
  removeWebhook(id: string) {
    state.webhooks = state.webhooks.filter((w) => w.id !== id);
    emit();
  },
  /** Complete OAuth. dm.write alone is not enough — reach is bounded by followers. */
  connectX(handle: string) {
    state.x = { handle: handle.replace(/^@/, ''), status: 'pending', authorized: true, reachableFollowers: 0, checked: false };
    emit();
  },
  /** Same two-stage shape as the sending domain: authorised-with-nobody-reachable is a real state. */
  checkX() {
    const x = state.x;
    if (x.status === 'none') return;
    if (!x.checked) {
      state.x = { ...x, checked: true, status: 'pending' };
      emit();
      return;
    }
    const reachableFollowers = x.reachableFollowers > 0 ? x.reachableFollowers : 610;
    state.x = { ...x, reachableFollowers, status: reachableFollowers > 0 ? 'connected' : 'pending' };
    emit();
  },
  removeX() {
    state.x = { handle: '', status: 'none', authorized: false, reachableFollowers: 0, checked: false };
    emit();
  },
  /** Send (or resend) the setup instructions. */
  sendHandoff(email: string, channels: HandoffChannel[]) {
    state.handoff = {
      email: email.trim(),
      channels,
      sentAt: 'just now',
      sends: state.handoff.email === email.trim() ? state.handoff.sends + 1 : 1,
    };
    emit();
  },
  setHoldout(patch: Partial<HoldoutPolicy>) {
    state.holdout = { ...state.holdout, ...patch };
    emit();
  },
  clearHandoff() {
    state.handoff = { email: '', channels: [], sentAt: null, sends: 0 };
    emit();
  },
  setFrequency(patch: Partial<FrequencyBudget>) {
    state.frequency = { ...state.frequency, ...patch };
    emit();
  },
  removeMobileInstall() {
    state.mobile = { bundleId: '', status: 'none', apns: false, fcm: false, tokenSeen: false };
    emit();
  },
  completeOnboarding() {
    state.onboarded = true;
    try {
      localStorage.setItem(ONBOARD_KEY, '1');
    } catch {
      /* ignore */
    }
    emit();
  },
};

/** Everything a segment picker should offer: what the workspace ships with, plus what the
 *  operator has saved. One list, so nothing can show half of it. */
export function useSegments(): Segment[] {
  const saved = useSyncExternalStore(subscribe, () => state.segments);
  return useMemo(() => [...saved, ...SEGMENTS], [saved]);
}

export function useContracts(): IndexedContract[] {
  return useSyncExternalStore(subscribe, () => state.contracts);
}
export function useLists(): AudienceList[] {
  return useSyncExternalStore(subscribe, () => state.lists);
}
export function useTags(): Tag[] {
  return useSyncExternalStore(subscribe, () => state.tags);
}
export function useSender(): SenderDomain {
  return useSyncExternalStore(subscribe, () => state.sender);
}
export function usePushInstall(): PushInstall {
  return useSyncExternalStore(subscribe, () => state.push);
}
export function useMobileInstall(): MobilePushInstall {
  return useSyncExternalStore(subscribe, () => state.mobile);
}
export function useApiKeys(): ApiKey[] {
  return useSyncExternalStore(subscribe, () => state.apiKeys);
}
export function useWebhooks(): Webhook[] {
  return useSyncExternalStore(subscribe, () => state.webhooks);
}
export function useSuppressions(): Suppression[] {
  return useSyncExternalStore(subscribe, () => state.suppressions);
}
export function useOnboarded(): boolean {
  return useSyncExternalStore(subscribe, () => state.onboarded);
}
export function useHoldout(): HoldoutPolicy {
  return useSyncExternalStore(subscribe, () => state.holdout);
}
export function useHandoff(): Handoff {
  return useSyncExternalStore(subscribe, () => state.handoff);
}
export function useFrequency(): FrequencyBudget {
  return useSyncExternalStore(subscribe, () => state.frequency);
}
export function useX(): XInstall {
  return useSyncExternalStore(subscribe, () => state.x);
}

/** Every channel's readiness in one list, so the dashboard doesn't have to know how each
 *  channel's setup works — only whether it is done. */
export function useChannelReadiness(): ChannelReadiness[] {
  const sender = useSender();
  const push = usePushInstall();
  const mobile = useMobileInstall();
  const x = useX();
  return [
    {
      id: 'email', label: 'Email', to: '/integrations',
      status: sender.status === 'verified' ? 'connected' : sender.status === 'pending' ? 'pending' : 'none',
      blocker: sender.status === 'verified' ? null
        : sender.status === 'pending' ? `${sender.domain} is waiting on DKIM and SPF`
        : 'No verified sending domain',
    },
    {
      id: 'push', label: 'In-app push', to: '/integrations',
      status: push.status === 'connected' || mobile.status === 'connected' ? 'connected'
        : push.status === 'pending' || mobile.status === 'pending' ? 'pending' : 'none',
      blocker: push.status === 'connected' || mobile.status === 'connected' ? null
        : push.status === 'pending' ? `SDK on ${push.origin} hasn't seen a connected wallet`
        : mobile.status === 'pending' ? `${mobile.bundleId} has no registered device yet`
        : 'SDK not installed',
    },
    {
      id: 'x', label: 'X', to: '/integrations', status: x.status,
      blocker: x.status === 'connected' ? null
        : x.status === 'pending' ? `@${x.handle} authorised. No followers with a linked wallet yet`
        : 'App not authorised',
    },
  ];
}

/** The handoff, reconciled against what has actually connected since it was sent.
 *
 *  Channels fall off `outstanding` the moment they go live, so the pending state resolves
 *  itself. Without this the workspace would keep saying "waiting on your developer" about a
 *  channel that started working an hour ago, which is the failure mode that teaches people
 *  to ignore status text. */
export function useHandoffStatus() {
  const handoff = useHandoff();
  const readiness = useChannelReadiness();
  const connected = new Set(readiness.filter((r) => r.status === 'connected').map((r) => r.id));
  const outstanding = handoff.channels.filter((c) => !connected.has(c));
  return {
    handoff,
    outstanding,
    done: handoff.channels.filter((c) => connected.has(c)),
    /** True while at least one handed-off channel is still not live. */
    waiting: handoff.sentAt !== null && outstanding.length > 0,
  };
}

// Derived read helpers (re-exported for screens/tests).
export { CONTACTS, listCount, tagCount };
export type { Contact };
