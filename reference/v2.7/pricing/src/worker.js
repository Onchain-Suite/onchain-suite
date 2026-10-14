/**
 * Password gate in front of the finance SSOT.
 *
 * NOT CURRENTLY WIRED UP. wrangler.jsonc is assets-only, so this file is not
 * deployed and the site is served openly. See the comment in wrangler.jsonc
 * for the two lines that switch it back on.
 *
 * Cloudflare Access cannot protect a *.workers.dev hostname - Access
 * applications attach to hostnames in a zone on your own account, and
 * workers.dev is Cloudflare's zone, not ours. Until this sits on a custom
 * domain, the gate has to live in the Worker.
 *
 * Shared password, no accounts. Appropriate for an internal document and
 * nothing more. The password is a Wrangler secret set by a human:
 *
 *   wrangler secret put SITE_PASSWORD
 *
 * Fails closed: with no secret configured the document is never served.
 */

const COOKIE = 'ossot';
const REALM  = 'onchainsuite-ssot-v1';
const MAX_AGE = 60 * 60 * 24 * 30;          // 30 days

const enc = new TextEncoder();

/** Cookie value: an HMAC over a fixed realm, keyed by the password.
 *  Verifiable without storing sessions, and useless if the password changes. */
async function stamp(secret){
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(REALM));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2,'0')).join('');
}

/** Length-independent comparison, so a wrong guess leaks no timing signal. */
function constantEquals(a, b){
  if(typeof a !== 'string' || typeof b !== 'string') return false;
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for(let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function readCookie(request, name){
  const raw = request.headers.get('Cookie') || '';
  for(const bit of raw.split(';')){
    const [k, ...v] = bit.trim().split('=');
    if(k === name) return v.join('=');
  }
  return null;
}

const shell = (body) => `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OnchainSuite Finance SSOT</title>
<meta name="robots" content="noindex,nofollow">
<style>
:root{color-scheme:light dark;--bg:#fff;--fg:#0F1319;--dim:#6E7787;--line:#CFD5DF;--blue:#1F35D6}
@media(prefers-color-scheme:dark){:root{--bg:#0E1117;--fg:#E9ECF1;--dim:#7E8899;--line:#333C4A;--blue:#8B9BFF}}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--fg);min-height:100vh;display:grid;place-items:center;padding:24px;
 font:15px/1.6 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
.card{width:100%;max-width:352px}
.mark{font:600 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--blue)}
h1{font:600 25px/1.15 'Iowan Old Style',Palatino,Georgia,serif;letter-spacing:-.015em;margin:9px 0 6px}
p{color:var(--dim);font-size:13.5px;margin-bottom:20px}
label{display:block;font:600 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);margin-bottom:7px}
input{width:100%;font:inherit;padding:10px 12px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--fg)}
input:focus{outline:2px solid var(--blue);outline-offset:1px;border-color:var(--blue)}
button{width:100%;margin-top:11px;font:600 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.09em;text-transform:uppercase;
 padding:11px;border:0;border-radius:6px;background:var(--blue);color:#fff;cursor:pointer}
button:hover{filter:brightness(1.1)}
.err{color:#B4232B;font-size:13px;margin-top:12px}
.note{font-size:12.5px;color:var(--dim);margin-top:18px;padding-top:14px;border-top:1px solid var(--line)}
code{font-family:ui-monospace,Menlo,monospace;font-size:12px}
</style></head><body><div class="card">${body}</div></body></html>`;

const loginPage = (error) => shell(`
  <div class="mark">OnchainSuite &middot; Internal</div>
  <h1>Finance SSOT</h1>
  <p>This document is internal and not for external distribution.</p>
  <form method="POST" autocomplete="off">
    <label for="p">Password</label>
    <input id="p" name="password" type="password" autofocus required>
    <button type="submit">Open</button>
    ${error ? `<div class="err">${error}</div>` : ''}
  </form>`);

const unconfigured = () => shell(`
  <div class="mark">OnchainSuite &middot; Internal</div>
  <h1>Not yet configured</h1>
  <p>The gate is deployed but no password has been set, so the document is not being served.</p>
  <div class="note">Set one from the <code>pricing/</code> directory:<br><br>
  <code>wrangler secret put SITE_PASSWORD</code><br><br>
  Wrangler prompts for the value; it is never written to the repository.</div>`);

export default {
  async fetch(request, env){
    const secret = env.SITE_PASSWORD;
    if(!secret){
      return new Response(unconfigured(), {status:503, headers:{'Content-Type':'text/html; charset=utf-8'}});
    }

    const expected = await stamp(secret);

    if(request.method === 'POST'){
      let supplied = '';
      try{ supplied = String((await request.formData()).get('password') || ''); }catch{ /* malformed body */ }
      if(constantEquals(supplied, secret)){
        return new Response(null, {status:303, headers:{
          'Location': new URL(request.url).pathname,
          'Set-Cookie': `${COOKIE}=${expected}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`
        }});
      }
      return new Response(loginPage('That password is not right.'), {
        status:401, headers:{'Content-Type':'text/html; charset=utf-8'}});
    }

    if(!constantEquals(readCookie(request, COOKIE) || '', expected)){
      return new Response(loginPage(''), {
        status:401, headers:{'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store'}});
    }

    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);
    out.headers.set('Cache-Control', 'private, no-store');
    out.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return out;
  }
};
