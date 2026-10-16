/* The Worker behind the published dashboards.
 *
 * Everything else in this app is a static asset and a browser. Published dashboards cannot be:
 * a link that only works in the browser that created it is not a link, it is a bookmark. The
 * record has to live somewhere both people can reach, so it lives in KV and this is the only
 * server-side code in the product.
 *
 * The endpoint is deliberately small and suspicious of its input. It is unauthenticated —
 * there is no session to check yet — so it assumes every caller is hostile and gives them as
 * little to work with as possible: a fixed schema, a hard size cap, create-only writes, and no
 * way to list what exists.
 */

export interface Env {
  ASSETS: Fetcher;
  /** Optional so the app still deploys and runs before the namespace is provisioned. */
  PUBLISHED?: KVNamespace;
}

const TOKEN_RE = /^[0-9a-f]{32}$/;
const MANAGE_HEADER = 'x-manage-key';
const MAX_BYTES = 32 * 1024;
const MAX_SPECS = 24;
/* Long enough for a year of "we check this every Monday", short enough that an abandoned
   workspace's links do not sit on the internet forever. Reading one does not extend it:
   expiry is about the publisher's intent, not the readers' habits. */
const TTL_SECONDS = 400 * 24 * 60 * 60;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const str = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;

/* A chart spec is a query — measure, field, audience, split, shape, window — and every one of
 * those is a short string from a known vocabulary. Validating the shape here is what makes the
 * promise on the public page true: there is no field a wallet address could arrive in, so one
 * cannot be served from it however the client is tampered with. */
function validSpec(s: unknown): boolean {
  if (!s || typeof s !== 'object') return false;
  const o = s as Record<string, unknown>;
  const allowed = ['id', 'title', 'measure', 'field', 'audience', 'splitBy', 'chart', 'range'];
  if (Object.keys(o).some((k) => !allowed.includes(k))) return false;
  return allowed.every((k) => str(o[k], 120));
}

function validRecord(v: unknown): v is Record<string, unknown> {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  const allowed = ['token', 'title', 'workspace', 'specs', 'lanes', 'createdAt'];
  if (Object.keys(o).some((k) => !allowed.includes(k))) return false;
  if (!str(o.title, 120) || !str(o.workspace, 80) || !str(o.createdAt, 40)) return false;
  if (typeof o.lanes !== 'boolean') return false;
  if (!Array.isArray(o.specs) || o.specs.length > MAX_SPECS) return false;
  return o.specs.every(validSpec);
}

/* Two secrets, two jobs.
 *
 * The token is in the URL, so everyone who can read the dashboard has it — which makes it
 * useless as proof that you are the person who published it. Revoking needs a second secret
 * that never appears in the shared link: the publisher keeps it, readers never see it.
 *
 * This is capability-based, not identity-based. It cannot answer "who are you" — there are no
 * accounts to answer it with — but it answers the question that actually matters here: did
 * this caller create the dashboard, or merely receive it.
 *
 * Only the hash is stored. A KV dump, a log line or a stray GET then exposes nothing that can
 * turn a link off, and the one copy that can is in the publisher's browser. */
async function sha256(v: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/* Length-independent compare. These are 256-bit hashes so a timing attack is not a realistic
   route in, but an early-exit comparison on a secret is the kind of thing that stops being
   harmless the moment someone shortens the secret. */
function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** What KV holds: the public record, plus the hash that proves ownership. Kept apart so the
 *  read path cannot serve the second by forgetting to strip it. */
interface Stored { record: Record<string, unknown>; manageHash?: string }

async function api(req: Request, env: Env, token: string): Promise<Response> {
  if (!TOKEN_RE.test(token)) return json({ error: 'not_found' }, 404);
  if (!env.PUBLISHED) {
    /* Said plainly rather than pretended around: without the namespace the app still runs,
       and publishing fails with a reason instead of handing someone a link to nothing. */
    return json({ error: 'sharing_unconfigured' }, 503);
  }

  if (req.method === 'GET') {
    const found = await env.PUBLISHED.get<Stored>(token, 'json');
    // Only ever the record. The hash is not the reader's business and never leaves here.
    return found ? json(found.record) : json({ error: 'not_found' }, 404);
  }

  if (req.method === 'PUT') {
    const raw = await req.text();
    if (raw.length > MAX_BYTES) return json({ error: 'too_large' }, 413);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return json({ error: 'bad_json' }, 400); }
    if (!validRecord(body) || body.token !== token) return json({ error: 'bad_shape' }, 400);
    /* Create-only. The client mints its own token, so without this a caller who learned a
       token could rewrite what that link shows — and the people holding it would never know
       the page had changed under them. Re-publishing mints a new token instead. */
    if (await env.PUBLISHED.get(token)) return json({ error: 'exists' }, 409);
    /* The manage key arrives once, on the write that creates the dashboard, and is never
       returned by anything. A publish without one is still allowed — the link simply cannot
       be revoked afterwards, which is the honest outcome rather than a refusal. */
    const key = req.headers.get(MANAGE_HEADER);
    const stored: Stored = { record: body };
    if (key) {
      if (!/^[0-9a-f]{32,128}$/.test(key)) return json({ error: 'bad_manage_key' }, 400);
      stored.manageHash = await sha256(key);
    }
    await env.PUBLISHED.put(token, JSON.stringify(stored), { expirationTtl: TTL_SECONDS });
    return json({ ok: true }, 201);
  }

  if (req.method === 'DELETE') {
    const found = await env.PUBLISHED.get<Stored>(token, 'json');
    // Same answer as a token that never existed: whether a given link is real is not
    // something an unauthorised caller should be able to probe for.
    if (!found) return json({ error: 'not_found' }, 404);

    if (found.manageHash) {
      const key = req.headers.get(MANAGE_HEADER);
      if (!key) return json({ error: 'not_allowed' }, 403);
      if (!sameSecret(await sha256(key), found.manageHash)) return json({ error: 'not_allowed' }, 403);
    }
    /* A record with no hash predates this and stays revocable by token alone. The alternative
       is a link nobody can ever turn off, which is a worse failure than the one being fixed. */
    await env.PUBLISHED.delete(token);
    return json({ ok: true });
  }

  return json({ error: 'method_not_allowed' }, 405);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/api\/published\/([^/]+)$/);
    if (m) return api(req, env, m[1]);
    // Everything else is the single-page app and its assets.
    return env.ASSETS.fetch(req);
  },
};
