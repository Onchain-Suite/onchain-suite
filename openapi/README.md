# API contract → TypeScript types

The frontend builds against the backend's OpenAPI contract. `swagger.json` here
is a snapshot of the backend's generated spec (`onchain-backend`'s
`src/docs/swagger.json`, also published at
[onchainsuite-api-docs.pages.dev](https://onchainsuite-api-docs.pages.dev)), and
`src/lib/api-types.ts` is generated from it with
[`openapi-typescript`](https://github.com/openapi-ts/openapi-typescript).

## Using the types

```ts
import type { paths, components } from '@/lib/api-types';

type ConnectorDirectoryEntry =
  components['schemas']['ConnectorDirectoryEntryDto'];

// request/response of a specific operation:
type AvailableResponse =
  paths['/api/v1/organization/connections/available']['get']['responses']['200']['content']['application/json'];
```

Every documented success response is wrapped by the backend in
`{ success, message, data, meta?, timestamp, requestId }` — the schema shown is
the value under `data`. Errors are `{ success:false, error:{ code, message,
details? }, meta }`; branch on `error.code`. (See the hosted docs' intro.)

## Keeping it current

```bash
bun run api:pull     # refresh openapi/swagger.json from the backend
                     # (sibling ../onchain-backend checkout, else the hosted spec)
bun run api:types    # regenerate src/lib/api-types.ts from it
```

CI runs **`api:types:check`** (regenerate + fail on drift) before the typecheck,
so the committed types can't fall out of sync with the committed spec, and a
backend contract change that the frontend hasn't adopted surfaces as a type
error in `type-check`. When the backend ships a contract change: `bun run
api:pull && bun run api:types`, then fix whatever stops compiling, and commit.
