import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SharingUnavailable, fetchPublished, publicUrl, publish, revoke } from './published';
import { newSpec } from './chartBuilder';

/* A published dashboard is the one thing here anyone can read without an account, so the
 * rules about where it lives, what it carries and how it dies are the ones worth pinning. */
describe('publishing a dashboard', () => {
  const base = { title: 'Overview', workspace: 'Acme', lanes: true };
  /** Stands in for the Worker: a token-keyed store behind the same three verbs. */
  let store: Map<string, string>;

  beforeEach(() => {
    localStorage.clear();
    store = new Map();
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const token = String(url).split('/').pop()!;
      const method = init?.method ?? 'GET';
      if (method === 'PUT') {
        if (store.has(token)) return new Response(null, { status: 409 });
        store.set(token, String(init!.body));
        return new Response(null, { status: 201 });
      }
      if (method === 'DELETE') { store.delete(token); return new Response(null, { status: 200 }); }
      const found = store.get(token);
      return found ? new Response(found, { status: 200 }) : new Response(null, { status: 404 });
    }));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('mints an unguessable token, not a countable id', async () => {
    const a = await publish({ ...base, specs: [] });
    const b = await publish({ ...base, specs: [] });
    expect(a.token).toMatch(/^[0-9a-f]{32}$/);
    expect(a.token).not.toBe(b.token);
    // The link is the only credential this page has.
    expect(publicUrl(a.token)).toContain(a.token);
  });

  it('stores the record where another browser can read it', async () => {
    const rec = await publish({ ...base, specs: [newSpec()] });
    // The first version kept this in localStorage, so a link worked for exactly one person
    // and failed only once it had already been sent to someone else.
    expect(store.has(rec.token)).toBe(true);
    expect(await fetchPublished(rec.token)).toMatchObject({ title: 'Overview', workspace: 'Acme' });
  });

  it('refuses to record a link when the store rejects it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 503 })));
    await expect(publish({ ...base, specs: [] })).rejects.toBeInstanceOf(SharingUnavailable);
    // Nothing kept locally: a link that was never stored must not appear in the list as if
    // it were live.
    expect(JSON.parse(localStorage.getItem('os:ons.published') ?? '[]')).toHaveLength(0);
  });

  it('survives the network being gone, without inventing a link', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    await expect(publish({ ...base, specs: [] })).rejects.toBeInstanceOf(SharingUnavailable);
  });

  it('copies the charts rather than referencing them', async () => {
    const spec = newSpec();
    const rec = await publish({ ...base, specs: [spec] });
    // Editing the dashboard afterwards must not silently change what an already-sent link
    // shows — re-publishing is a deliberate act.
    spec.title = 'Renamed after publishing';
    expect((await fetchPublished(rec.token))!.specs[0].title).not.toBe('Renamed after publishing');
  });

  it('stops working the moment it is revoked', async () => {
    const rec = await publish({ ...base, specs: [] });
    expect(await fetchPublished(rec.token)).not.toBeNull();
    await revoke(rec.token);
    // Not "marked inactive" — gone, for everyone holding the link.
    expect(await fetchPublished(rec.token)).toBeNull();
  });

  it('revokes one link without touching the others', async () => {
    const a = await publish({ ...base, specs: [] });
    const b = await publish({ ...base, title: 'Retention', specs: [] });
    await revoke(a.token);
    expect((await fetchPublished(b.token))?.title).toBe('Retention');
  });

  it('reads revoked, expired and never-existed as the same answer', async () => {
    expect(await fetchPublished('0'.repeat(32))).toBeNull();
  });

  it('has nowhere to put a contact even if someone tried', async () => {
    const rec = await publish({ ...base, specs: [newSpec()] });
    // The guarantee on the public page is structural: the record holds chart specs, a title
    // and a workspace name. A wallet address cannot ride along because there is no field for
    // one, and a chart spec is a query — measures, fields, windows — not rows.
    expect(Object.keys(rec).sort()).toEqual(['createdAt', 'lanes', 'specs', 'title', 'token', 'workspace']);
    const specKeys = Object.keys(rec.specs[0]).sort();
    expect(specKeys).not.toContain('rows');
    expect(specKeys).not.toContain('contacts');
  });

  it('falls back to a usable name rather than an empty heading', async () => {
    expect((await publish({ ...base, title: '   ', specs: [] })).title).toBe('Dashboard');
  });
});
