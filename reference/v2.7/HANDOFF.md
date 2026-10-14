# OnchainSuite — Engineering Handoff

**What this is:** a working, production-stack frontend for the OnchainSuite dashboard, built
against the design handoff and `FLOWS.md`. Every screen and flow is implemented and
interactive. **There is no backend** — all data is mocked behind a typed seam.

**What it is not:** a running product. Nothing sends an email, indexes a chain, or
authenticates a user. See [§3 Blockers](#3-blockers-p0).

---

## 1. Run it

```bash
cd web
npm install
npm run dev          # http://localhost:4175
```

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server, port 4175 |
| `npm run build` | Typecheck + production build → `dist/` |
| `npm test` | Vitest — 146 tests |
| `npm run lint` | ESLint, `--max-warnings 0` (includes `jsx-a11y`) |
| `npm run deploy` | Build + `wrangler deploy` to Cloudflare |
| `npm run build:html` | Single self-contained `.html` for sharing |

**Live:** https://onchainsuite.aborodeolusegun.workers.dev (Cloudflare Workers static assets,
public, no auth). Config in `web/wrangler.jsonc`.

**Stack:** React 18 + TypeScript (strict) + Vite + React Router. Four runtime dependencies
total (`react`, `react-dom`, `react-router-dom`, `lucide-react`). No UI framework — components
are hand-built on the design system's CSS tokens.

---

## 2. Architecture

```
web/src/
  components/      ui.tsx (primitives), icons.tsx, toast.tsx, ErrorBoundary.tsx,
                   SenderDomain.tsx, PushInstall.tsx, MobilePushInstall.tsx
  screens/         one file per screen + the heavy builders
  shell/           Shell.tsx — sidebar, top bar, command palette, routing frame
  data/            ← THE BACKEND SEAM. Types, mock data, API, stores, pricing, email rules
  styles/          design-system tokens (colors, typography, spacing, effects) — vendored
```

**39 source files, ~7,400 LOC, 9 test files.**

### The seam you replace

Everything server-shaped lives in `web/src/data/`. Screens never fetch — they call `api.*`
or read a store. Swapping in a real backend is contained to this directory.

| File | Role | What to do |
|---|---|---|
| `api.ts` | Read API. Each method returns typed domain data after a fake 120 ms delay. | **Replace bodies with `fetch()`.** Signatures stay identical — no screen changes. |
| `types.ts` | Domain types (`Contact`, `Campaign`, `Automation`, `FormRow`, `Segment`…). | Make these match your API contract; they're the shared vocabulary. |
| `mock.ts` | Deterministic seed data (no `Math.random`, so tests are reproducible). | Delete once `api.ts` is live. |
| `store.ts` | Mutable client state (`useSyncExternalStore`) — lists, tags, suppressions, onboarding, sender domain, push installs (web + mobile). | Replace with React Query mutations or your state lib. |
| `useAsync.ts` | Minimal read hook with loading/error. | Swap for React Query. |
| `persist.ts` | localStorage persistence + CSV download + clipboard helpers. | Persistence goes server-side; keep the CSV/clipboard utils. |
| `queries.ts` | Intelligence: question → shaped result (SQL, rows, chart series, segment). | Replace with the real NL→SQL service. Same in/out shape. |
| `pricing.ts` | **Pricing catalog — source of truth.** See §4. | Keep in sync with billing backend. |
| `email.ts` | Merge tags + compliance footer rules. See §5. | Enforce server-side too. |
| `sdk.ts` | **`identify()` contract — wallet-only.** See §5. | Mirror in `POST /v1/identify`. Non-negotiable. |

---

## 3. Blockers (P0)

These are why this is not yet a product. None are frontend work.

1. **No backend.** Every read is a mock; every write is in-memory or localStorage.
2. **No authentication or authorisation.** There is no login, no session, no tenancy. The
   deployed URL is public — anyone with the link sees the full dashboard.
3. **No chain indexing, no wallet enrichment, no ZK.** The identity model is represented in
   the UI only. No contract is indexed, no proof is generated.
4. **Nothing sends.** No email, no push. There is no ESP integration, no delivery, no
   webhooks, no bounce handling.
5. **No real setup verification.** All three gates simulate their checks: sender-domain
   DKIM/SPF, the web SDK handshake, and the mobile credential + device-token registration.

Secondary: no observability/error reporting, no rate limiting, no audit log, no i18n.

---

## 4. Pricing — must stay in sync

`web/src/data/pricing.ts` implements the **v4 live model** (revised 5 Aug 2026), which
supersedes the 24 Jul PDF and its v3 predecessor. It is the single place a price lives; **UI
reads from it, never hardcodes**. `pricing.test.ts` asserts every published number, so drift
between the model and the product fails CI.

Invariants the product must enforce:

- **No free tier.** PAYG is the entry point (1,000 contacts / 2 seats / 3 automations). The
  contacts cap must equal `PLANS.payg.allowances.contacts` — a test binds them.
- **Five selectable tiers**: PAYG, Launch $49, Growth $349, Pro $799, Scale $2,299.
- **Email and in-app push are separate allowances.** The blended "messages" meter is retired,
  and so is the push add-on SKU — push is bundled per tier.
- **Six meters**: email $1/1k, push $1/1k, ONS+ $10/1k, on-chain $10/10k, AI $5/1k,
  concierge $150/hr.
- **On-chain credits must stay above $8.33 / 10,000** — the un-cached GoldRush cost. The old
  $2.50 lost money on every cache miss.
- **Monthly billing only.** No annual price exists on any plan; a test asserts the field is
  absent, because reinstating it is a pricing decision rather than a refactor.
- **A plan is a discount on list; overage is not.** Every tier's allowances bought at list cost
  more than the tier ($81/$575/$1,930/$4,650), so exceeding an allowance costs 1.65×–2.42× more
  per unit. If that ever inverts, overage becomes the cheaper way to buy the same units and the
  ladder stops meaning anything — tests assert both the list values and the multiples.
- **No revenue cliffs.** `billingState()` encodes it: allowance exhausted or plan expired →
  usage-based against the prepaid wallet; **only an empty wallet blocks**.
- **Stripe 3.325% + $0.25** is the payment rail; cross-currency settlement costs 5.33%.

### Two corrections that shaped the catalogue

**1. PAYG contacts is 500, not 25,000** *(resolved — 500 confirmed)*. The doc carried both:
§2's catalog table said 500, §3's caps bullet said 25,000. The code had inherited both, in
`allowances.contacts` and `PAYG_CAPS.contacts` respectively.

It was not cosmetic. At 25,000 the free-to-start entry tier would have allowed **5× Launch's
5,000 contacts** while costing about **$20 of metered usage against Launch's $29** — Launch
would have been strictly dominated and never rationally bought. Two tests now guard it: one
binds the cap to the plan allowance, one asserts Launch still beats PAYG on contacts.

**2. §3's expansion claim describes the wrong lever** *(no price change needed)*. It says
overage rates "sit above the plan-implied rates so heavy usage converts to expansion
revenue." They sit below on every tier — Launch −31%, Growth −20%, Pro −24% — and no pricing
change can make the sentence true, because a bundle has no single implied unit rate for
overage to sit above.

This costs nothing. Expansion is driven by **contacts, seats and automations**, which are
not metered at all, and that mechanism works. Overage exists to prevent cut-offs. Margins are
untouched: every meter still sells at 2.5–10× cost (doc §6), and §9's 56–63% blended margins
stand. **Fix the sentence, not the prices** — raising overage above plan-implied would mean
~$1.25/1k messages and ~$3.15/10k wallet-data, pricing above incumbents on the number buyers
compare first, to fix a mechanism that is not broken.

---

## 5. Compliance rules baked into the UI

Two are legal, not cosmetic. Both are enforced client-side today and **must be enforced
server-side before sending anything real**.

**Email footer** (`data/email.ts`) — CAN-SPAM §7704(a)(3)/(5), GDPR Art. 21. Every template
(seeded, blank, or HTML-imported) gets a locked footer carrying `{{sender_name}}`,
`{{sender_address}}` and `{{unsubscribe_url}}`. `ensureFooter()` runs on every block mutation
and is idempotent; the block cannot be deleted or reordered below. The editor shows a live
Compliant / *N tags missing* indicator.

**ZK identity privacy** (`data/mock.ts`, `AudienceScreen.tsx`) — when a contact's email is
linked by zero-knowledge proof, the operator **must never see the address**. Such contacts
carry `email: null` while still being `reachable: ['email']`; the UI renders "ZK-protected".
Tests assert the address is never rendered. **Do not "fix" this by exposing the email** — it
is the product's core privacy claim.

**ZK collection boundary** — see `ZK-ARCHITECTURE.md`. The proof layer stops *us* seeing an
identifier; it does not stop the protocol whose page collected it. Until identity capture moves
to a cross-origin frame, the "ZK-protected" label and the Privacy copy overclaim. That document
sets out the fix, the build order, and the wording that is safe to use meanwhile.

**SDK `identify()` is wallet-only** (`data/sdk.ts`) — this is the narrowest point in the ZK
story and the easiest to lose by accident. The SDK runs inside the *operator's own* dApp, so
anything it sends is data they already hold. If `identify()` ever accepts an email, the
operator has handed themselves the wallet↔identity mapping we told them they could not have.
No proof is broken; the address just walks in through a side door.

`assertIdentify()` enforces this twice: forbidden keys are typed `never` (compile time), and
rejected by name, by email-shaped value, and inside `meta` (run time). It **throws rather
than sanitising** — silently dropping the field would let a caller believe it was stored.

> **Backend:** `data/sdk.ts` is the reference for `POST /v1/identify`. The server must mirror
> it. The runtime half is the half that matters there: the SDK is called from untyped
> JavaScript in the wild, where the types do not exist. 16 tests in `data/sdk.test.ts`.

### Setup gates — all three block sending

| Channel | Gate | Signals |
|---|---|---|
| Email | Sender domain verified | DKIM **and** SPF resolve |
| Push · web | SDK connected | Script live on allowlisted origin **and** a wallet reported |
| Push · mobile | App connected | APNs **or** FCM credential **and** a device token registered |

Web and mobile are separate installs; the campaign wizard gates on whichever surface is
chosen. Mobile is "or" on credentials because shipping one platform is a real choice, and it
needs the device signal because a token only exists after the user grants OS permission —
credentials alone never mean ready.

---

## 6. Test coverage — read this honestly

**146 tests, 9 files, all green.** They cover:

- Pricing catalog (every published number, annual rule, lifecycle states)
- Email compliance footer (idempotency, survives import, required tags)
- Mock-data invariants (**including the ZK privacy invariant**)
- Interaction tests for all five flows (automations gate, wizard reach recalc, Intelligence
  SQL + segment carry-over, forms template gate, analytics range, settings validation)
- Two `axe` accessibility smoke tests (Dashboard, Audience)

**Not covered:** the email/form builders' deeper editing paths, dark mode, responsive
breakpoints, and there are **no E2E tests** (no Playwright). The a11y sweep is two screens,
not eight. Treat coverage as "the critical paths are pinned", not "comprehensive".

---

## 7. Suggested build-out order

1. **Auth + tenancy first** — everything else assumes an org context.
2. **Replace `api.ts` with real endpoints**, one method at a time; types already exist.
3. **Contract indexing + wallet enrichment** — the product's cost centre and value centre.
4. **ESP integration** (Azure → AWS SES per the plan) + real DNS verification + bounce/
   suppression handling.
5. **Billing** against `pricing.ts` — metering, prepaid wallet, Blockradar checkout.
6. **Automations runtime** — the canvas produces a flow definition; the executor is missing.
7. **ZK identity linking** — the largest unknown; UI contract is defined, crypto is not.

---

## 8. Repo layout beyond `web/`

- `web/` — **the production app. This is what you build on.**
- `app/` — earlier prototype rendering the design-system bundle directly (Babel-in-browser).
  Useful as a visual reference for the intended design; **not** the codebase to extend.
- `handoff/`, `uploads/` — the original design handoff, screen sources, component contracts,
  and the product PDFs.
- `FLOWS.md` (in the design handoff) — the behavioural spec every flow was built against.
  Where this repo and that doc disagree, the doc describes intent and the code describes what
  ships today.

---

## 9. Known rough edges

- Onboarding state persists, but a **"Reset demo data"** control lives in Settings → Account
  for clean demos.
- Intelligence's **Re-run** on edited SQL resets the dirty flag but does not change rows —
  there is no SQL engine behind it.
- The **push builder** has no design-handoff counterpart; it was designed to match.
- `app/app-custom-v1.jsx.bak` is a superseded hand-built approximation, kept only for
  reference. Safe to delete.
