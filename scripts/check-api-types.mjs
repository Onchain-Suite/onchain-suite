/**
 * Drift gate: regenerate the API types from openapi/swagger.json and fail if the
 * committed src/lib/api-types.ts is stale. Keeps the generated types in lockstep
 * with the committed spec, so `type-check` always compiles the app against the
 * current contract. Run in CI before the typecheck.
 */
import { spawnSync } from 'node:child_process';

const gen = spawnSync(
  'bunx',
  ['openapi-typescript', 'openapi/swagger.json', '-o', 'src/lib/api-types.ts'],
  { stdio: 'inherit' },
);
if (gen.status !== 0) process.exit(gen.status ?? 1);

const diff = spawnSync(
  'git',
  ['diff', '--exit-code', '--', 'src/lib/api-types.ts'],
  { stdio: 'inherit' },
);

if (diff.status !== 0) {
  console.error(
    '\n[check-api-types] src/lib/api-types.ts is OUT OF DATE for the committed ' +
      'spec.\nRun `bun run api:types` and commit the result. (If the backend ' +
      'contract changed, `bun run api:pull` first.)',
  );
  process.exit(1);
}

console.log('[check-api-types] api-types.ts matches openapi/swagger.json.');
