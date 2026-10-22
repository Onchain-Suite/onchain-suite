/**
 * Refresh openapi/swagger.json from the backend's generated OpenAPI spec, then
 * regenerate the TypeScript types from it (`bun run api:types`).
 *
 * The backend generates src/docs/swagger.json from its controller/DTO
 * decorators and gates that on CI (its `swagger:check`). This pulls that spec in
 * so the frontend builds against the real contract: a breaking change there
 * turns into a type error here.
 *
 * Source order:
 *   1. a sibling backend checkout (../onchain-backend) — the common local setup;
 *   2. else the hosted docs spec at API_SPEC_URL (default the Pages site). If the
 *      docs are behind Cloudflare Access, a headless fetch 403s — download
 *      swagger.json by hand into openapi/ in that case.
 */
import fs from 'node:fs';
import path from 'node:path';

const dest = path.resolve('openapi/swagger.json');
const sibling = path.resolve('../onchain-backend/src/docs/swagger.json');
const url =
  process.env.API_SPEC_URL ||
  'https://onchainsuite-api-docs.pages.dev/swagger.json';

fs.mkdirSync(path.dirname(dest), { recursive: true });

if (fs.existsSync(sibling)) {
  const text = fs.readFileSync(sibling, 'utf8');
  JSON.parse(text); // validate it is JSON before overwriting
  fs.writeFileSync(dest, text);
  console.log(`[api:pull] copied from sibling backend → openapi/swagger.json`);
} else {
  const res = await fetch(url);
  if (!res.ok) {
    console.error(
      `[api:pull] GET ${url} failed: ${res.status}. If the docs sit behind ` +
        `Cloudflare Access a headless fetch is blocked — download swagger.json ` +
        `by hand into openapi/ and re-run \`bun run api:types\`.`,
    );
    process.exit(1);
  }
  const text = await res.text();
  JSON.parse(text);
  fs.writeFileSync(dest, text);
  console.log(`[api:pull] fetched ${url} → openapi/swagger.json`);
}

console.log('[api:pull] now run: bun run api:types');
