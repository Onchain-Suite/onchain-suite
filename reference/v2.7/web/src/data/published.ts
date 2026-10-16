import { useSyncExternalStore } from 'react';
import { loadPersisted, savePersisted } from './persist';
import type { ChartSpec } from './chartBuilder';

/* Published dashboards (2.7).
 *
 * A dashboard that only exists behind a login is a dashboard somebody screenshots into Slack
 * every Monday. Publishing turns it into a URL: the charts, live, for anyone holding the link,
 * with no account and no sign-in.
 *
 * The record lives on the server, which is the whole point and was the thing the first version
 * got wrong. It kept published dashboards in localStorage, so a link worked perfectly for the
 * person who made it and showed "isn't available" to everyone else — a bookmark wearing a
 * link's clothes, and the failure only appears once you have already sent it to someone.
 *
 * What is kept locally is the list of links this browser created, because without accounts the
 * server has no idea which are yours. That list is a convenience; the dashboards themselves
 * are not in it.
 *
 * Three decisions are load-bearing, and all three are about what a link can do that a login
 * cannot.
 *
 * It is live, not a snapshot. A frozen copy is safer and almost always wrong by the time it is
 * read, and the people you send a dashboard to are the ones who most need the current number.
 * The charts are copied at publish time though, so editing one afterwards cannot silently
 * change what a link you already sent is showing.
 *
 * It carries charts and nothing else, enforced by shape rather than by remembering: the record
 * holds chart specs, a title and a workspace name, and the server rejects anything with a
 * field it does not recognise. A chart spec is a query, not rows.
 *
 * It can be revoked, immediately. A link you cannot kill is a leak you cannot stop.
 */
export interface Published {
  /** The public id. Long and random: the link is the credential, so it has to be unguessable. */
  token: string;
  title: string;
  /** Who it says it is from, on the public page. */
  workspace: string;
  specs: ChartSpec[];
  /** Whether the three-lane overview chart rides along. */
  lanes: boolean;
  createdAt: string;
}

/* The publisher's copy: the dashboard plus the secret that can turn it off.
 *
 * The manage key never goes in the shared link and the server only ever stores its hash, so
 * this browser holds the only copy that can revoke. That is the point — the token proves you
 * can read the dashboard, and this proves you are the one who made it — and it is also the
 * cost: clear this browser's storage and the link keeps working with nobody able to stop it.
 * The dialog says so rather than letting someone find out. */
interface Owned extends Published { manageKey: string }

/** Thrown when the backing store is not configured — never swallowed into a local-only link
 *  that looks shareable and is not. */
export class SharingUnavailable extends Error {
  constructor() {
    super('Sharing isn’t set up on this deployment yet, so no link was created. Nothing was saved.');
    this.name = 'SharingUnavailable';
  }
}

const KEY = 'ons.published';
const api = (token: string) => `/api/published/${token}`;

/** Links this browser created, with the key that revokes each. */
let mine: Owned[] = loadPersisted<Owned[]>(KEY, []);
const subs = new Set<() => void>();

function emit() {
  savePersisted(KEY, mine);
  subs.forEach((f) => f());
}

/* 128 bits from the platform CSPRNG. A short id would be a dashboard anyone could find by
   counting, and these pages have no second factor behind them. */
function mintSecret(bytes = 16): string {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export async function publish(input: {
  title: string; workspace: string; specs: ChartSpec[]; lanes: boolean;
}): Promise<Published> {
  /* Separate from the token and never shared: the link alone must not be enough to revoke,
     or every recipient of a dashboard can turn it off for everyone else. */
  const manageKey = mintSecret(32);
  const rec: Published = {
    token: mintSecret(),
    title: input.title.trim() || 'Dashboard',
    workspace: input.workspace,
    specs: input.specs.map((s) => ({ ...s })),
    lanes: input.lanes,
    createdAt: new Date().toISOString(),
  };

  const res = await fetch(api(rec.token), {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-manage-key': manageKey },
    body: JSON.stringify(rec),
  }).catch(() => null);

  /* Anything other than a created record is a failure, including the dev server answering a
     PUT with its index.html. Recording it locally anyway is how the first version produced
     links that worked for exactly one person. */
  if (!res || !res.ok) throw new SharingUnavailable();

  mine = [...mine, { ...rec, manageKey }];
  emit();
  return rec;
}

/** True when the link is actually off. False means it is still live and still listed — a
 *  revoke that quietly fails is how someone believes they closed a door that is open. */
export async function revoke(token: string): Promise<boolean> {
  const owned = mine.find((p) => p.token === token);
  const res = await fetch(api(token), {
    method: 'DELETE',
    headers: owned?.manageKey ? { 'x-manage-key': owned.manageKey } : {},
  }).catch(() => null);

  // 404 counts: already gone is the state we were asking for.
  const gone = Boolean(res && (res.ok || res.status === 404));
  if (gone) {
    mine = mine.filter((p) => p.token !== token);
    emit();
  }
  return gone;
}

/** Read a published dashboard by token. Returns null for revoked, expired and never-existed
 *  alike — the public page says the same thing for all three on purpose. */
export async function fetchPublished(token: string): Promise<Published | null> {
  const res = await fetch(api(token), { headers: { accept: 'application/json' } }).catch(() => null);
  if (!res || !res.ok) return null;
  try {
    return (await res.json()) as Published;
  } catch {
    return null;
  }
}

export function usePublishedByMe(): Owned[] {
  return useSyncExternalStore(
    (f) => { subs.add(f); return () => subs.delete(f); },
    () => mine,
  );
}

export const publicUrl = (token: string) => `${window.location.origin}/d/${token}`;
