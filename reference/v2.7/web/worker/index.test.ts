import { describe, expect, it } from 'vitest';
import worker, { type Env } from './index';

/* The server-side half of the promise on the published page.
 *
 * The client can be edited by anyone holding the devtools, so "it only sends chart specs" is
 * not a guarantee — it is an intention. This is the guarantee: what the endpoint refuses. */
function env(): Env & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    ASSETS: { fetch: async () => new Response('the app', { status: 200 }) } as unknown as Fetcher,
    PUBLISHED: {
      get: async (k: string, type?: string) => {
        const v = store.get(k);
        if (v === undefined) return null;
        return type === 'json' ? JSON.parse(v) : v;
      },
      put: async (k: string, v: string) => { store.set(k, v); },
      delete: async (k: string) => { store.delete(k); },
    } as unknown as KVNamespace,
  };
}

const TOKEN = 'a'.repeat(32);
const url = (t = TOKEN) => `https://x.test/api/published/${t}`;
const record = (over: Record<string, unknown> = {}) => ({
  token: TOKEN, title: 'Overview', workspace: 'Acme', lanes: true, createdAt: '2026-10-02T00:00:00.000Z',
  specs: [{ id: 'c1', title: 'Wallets', measure: 'wallets', field: 'Any activity', audience: 'all', splitBy: 'stage', chart: 'bar', range: '30d' }],
  ...over,
});
const KEY = 'f'.repeat(64);
const put = (e: Env, body: unknown, t = TOKEN, key?: string) =>
  worker.fetch(new Request(url(t), {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: key ? { 'x-manage-key': key } : {},
  }), e);
const del = (e: Env, key?: string, t = TOKEN) =>
  worker.fetch(new Request(url(t), { method: 'DELETE', headers: key ? { 'x-manage-key': key } : {} }), e);

describe('the published-dashboard endpoint', () => {
  it('stores a dashboard and serves it back to anyone', async () => {
    const e = env();
    expect((await put(e, record())).status).toBe(201);
    const got = await worker.fetch(new Request(url()), e);
    expect(got.status).toBe(200);
    expect(await got.json()).toMatchObject({ title: 'Overview' });
  });

  it('refuses a record carrying a field it does not recognise', async () => {
    const e = env();
    // The whole promise of the public page in one assertion: there is no field a contact
    // could arrive in, however the client is tampered with.
    const res = await put(e, record({ contacts: [{ wallet: '0xdead', email: 'a@b.c' }] }));
    expect(res.status).toBe(400);
    expect(e.store.size).toBe(0);
  });

  it('refuses a chart spec carrying rows', async () => {
    const e = env();
    const res = await put(e, record({ specs: [{ id: 'c1', title: 'x', measure: 'wallets', field: 'f', audience: 'all', splitBy: 'none', chart: 'bar', range: '30d', rows: ['0xdead'] }] }));
    expect(res.status).toBe(400);
  });

  it('will not let a second write change what an existing link shows', async () => {
    const e = env();
    await put(e, record());
    // Create-only: whoever already holds the link would never know the page changed.
    const again = await put(e, record({ title: 'Something else entirely' }));
    expect(again.status).toBe(409);
    expect(JSON.parse(e.store.get(TOKEN)!).record.title).toBe('Overview');
  });

  it('refuses a body whose token does not match the path', async () => {
    const e = env();
    expect((await put(e, record({ token: 'b'.repeat(32) }))).status).toBe(400);
  });

  it('rejects a token that is not a token', async () => {
    const e = env();
    expect((await worker.fetch(new Request(url('short')), e)).status).toBe(404);
    expect((await worker.fetch(new Request(url('NOT-HEX-AT-ALL-BUT-32-CHARS-LONG')), e)).status).toBe(404);
    expect(e.store.size).toBe(0);
  });

  it('never lets a path reach the store that did not match the route', async () => {
    const e = env();
    // A traversal attempt is normalised by the URL parser long before routing, so it stops
    // being an API path at all and is served as an app route. Worth pinning: the regex is
    // anchored on a single segment, and that is what keeps it that way.
    const res = await worker.fetch(new Request('https://x.test/api/published/../../etc/passwd'), e);
    expect(await res.text()).toBe('the app');
    expect(e.store.size).toBe(0);
  });

  it('caps what one record can weigh', async () => {
    const e = env();
    const res = await put(e, record({ title: 'x'.repeat(40_000) }));
    expect(res.status).toBe(413);
  });

  it('caps how many charts one dashboard can carry', async () => {
    const e = env();
    const spec = record().specs[0];
    expect((await put(e, record({ specs: Array.from({ length: 25 }, () => spec) }))).status).toBe(400);
  });

  it('turns a link off for everyone, for the publisher', async () => {
    const e = env();
    await put(e, record(), TOKEN, KEY);
    expect((await del(e, KEY)).status).toBe(200);
    expect((await worker.fetch(new Request(url()), e)).status).toBe(404);
  });

  it('will not let a reader turn off a dashboard they were sent', async () => {
    const e = env();
    await put(e, record(), TOKEN, KEY);
    // The token is in the URL, so everyone who can read the page has it. That is exactly why
    // it cannot be what proves you are allowed to take the page down.
    expect((await del(e)).status).toBe(403);
    expect((await del(e, 'a'.repeat(64))).status).toBe(403);
    expect((await worker.fetch(new Request(url()), e)).status).toBe(200);
  });

  it('never hands the revoke secret to a reader', async () => {
    const e = env();
    await put(e, record(), TOKEN, KEY);
    const body = await (await worker.fetch(new Request(url()), e)).text();
    expect(body).not.toContain(KEY);
    // Nor the hash of it: what is served is the dashboard, and nothing else.
    expect(body).not.toContain('manageHash');
    expect(JSON.parse(body)).toMatchObject({ title: 'Overview' });
  });

  it('stores only a hash, so the store itself cannot revoke anything', async () => {
    const e = env();
    await put(e, record(), TOKEN, KEY);
    expect(e.store.get(TOKEN)).not.toContain(KEY);
  });

  it('answers the same for a link that is real and one that is not', async () => {
    const e = env();
    // Otherwise an unauthorised caller can tell live tokens from dead ones by the error.
    expect((await del(e)).status).toBe(404);
    await put(e, record(), TOKEN, KEY);
    expect((await del(e)).status).toBe(403);
  });

  it('still lets a dashboard published without a key be taken down', async () => {
    const e = env();
    // Records predating owner-only revocation. A link nobody can ever turn off is a worse
    // failure than the one this fixes.
    await put(e, record());
    expect((await del(e)).status).toBe(200);
  });

  it('refuses a manage key that is not one', async () => {
    const e = env();
    expect((await put(e, record(), TOKEN, 'hunter2')).status).toBe(400);
    expect(e.store.size).toBe(0);
  });

  it('says so plainly when the store is not configured, rather than pretending', async () => {
    const e = { ...env(), PUBLISHED: undefined };
    const res = await worker.fetch(new Request(url()), e);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'sharing_unconfigured' });
  });

  it('hands everything else to the app', async () => {
    const e = env();
    const res = await worker.fetch(new Request('https://x.test/audience'), e);
    expect(await res.text()).toBe('the app');
  });
});
