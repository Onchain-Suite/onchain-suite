# Making the ZK claim true

**For:** CTO / engineering
**Status:** proposal — the current build does not yet meet this claim
**Written:** 8 Aug 2026

---

## 1. The problem, stated precisely

Our CTO is right, and the distinction he drew is the whole issue:

> Our ZK infra only prevents OnchainSuite from seeing the data. The protocol still gets to see
> the info from users even after the users toggle ZK.

These are two different guarantees and the product currently conflates them:

| Guarantee | True today? |
|---|---|
| **OnchainSuite cannot see the identifier** | Yes — this is what the ZK layer buys |
| **The protocol cannot see the identifier** | **No** — but the UI implies it |

The reason is not cryptographic. It is where the bytes are typed.

When a subscriber enters an email into a form that renders **inside the protocol's own page**,
that input lives in the protocol's DOM. Their JavaScript can read it before it reaches us:

```js
// Anything the protocol can run on their own page, because it is their page.
document.querySelector('input[name=email]').value
new MutationObserver(...)            // or watch the field
window.fetch = wrapped               // or wrap fetch and read the body
```

No proof system prevents this. A ZK proof attests *"this wallet controls an identifier
satisfying P"* without revealing the identifier **to the verifier**. We are the verifier. The
protocol is the *collector*, and a collector always sees what it collects.

**So the fix is not a better proof. It is moving the collection boundary.**

---

## 2. What the UI currently claims

Three places assert the strong guarantee, and all three are wrong until this lands:

- `AudienceScreen` renders **"ZK-protected"** where the email would be — implying the operator
  cannot obtain it.
- `SettingsScreen` → Privacy: *"You can message a wallet without ever seeing the proof's
  underlying identity."* Addressed to the operator, who did see it.
- `data/mock.ts` models ZK contacts as `email: null`, encoding "the operator does not have this."

If that reaches subscribers as a privacy promise, it is a false statement about personal data —
a regulatory problem under GDPR Art. 5(1)(a) (transparency), not a copy problem.

---

## 3. The fix: move collection out of the protocol's origin

The single structural change:

> **The subscriber must type their identifier into a document the protocol does not control.**

Browsers already enforce this. Same-origin policy means a parent page **cannot** read the DOM,
inputs, or JS context of a cross-origin iframe. That is a browser security boundary, not a
convention — it is the same mechanism that stops any site reading a Stripe card field.

### Architecture

```
Protocol's dApp (app.vault77.com)
├── OnchainSuite SDK  ───────────────► wallet address only (identify)
└── <iframe src="https://link.onchainsuite.xyz/collect?token=…">
        └── email input ──────────────► POSTs directly to OnchainSuite
            (protocol JS cannot read this — different origin)
```

The protocol embeds the iframe but can never look inside it. The identifier goes straight from
the subscriber's browser to us. The protocol learns only what we choose to return: *"wallet
0x1A2b… is now email-reachable."*

### Required properties

1. **Distinct origin.** `link.onchainsuite.xyz`, not a path on the customer's domain. A custom
   domain (`link.vault77.com`) that CNAMEs to us **breaks this** — same-origin policy is about
   origin, not DNS ownership, and the protocol could then script it. If customers want branded
   collection, the branding must be inside our origin's iframe, not a CNAME.
2. **`sandbox` + strict CSP** on the iframe document, so injected script cannot exfiltrate.
3. **No `postMessage` echo of the raw identifier.** The frame may post `{status:'linked'}` back.
   It must never post the value — one convenience callback undoes the whole boundary.
4. **Signed embed token** binding the frame to a workspace, an origin allow-list and an expiry,
   so an embed cannot be lifted to another site to harvest.
5. **Wallet signature inside the frame.** The subscriber signs the link intent so consent is
   attributable and replay is prevented.

---

## 4. What we store, and what makes it zero-knowledge

Collecting cross-origin fixes *who sees it*. It does not by itself stop **us** storing it. Both
halves are needed for the claim to hold end to end.

**Store, per link:**

| Field | Purpose |
|---|---|
| `wallet` | The address. Not secret — it is on-chain. |
| `identifier_commitment` | `Poseidon(identifier, salt)` — hiding and binding |
| `encrypted_identifier` | Sealed to a key we do not hold (see below) |
| `proof` | Groth16 proof of the statement in §5 |
| `consent_sig` | Wallet signature over the link intent |

**Never store:** the raw identifier in plaintext, in logs, in error traces, or in analytics.

The delivery problem is the hard part: to send an email we must at some point hold a sendable
address. Two defensible designs — pick one and write it down, because it determines what we can
truthfully say:

**(a) Sealed delivery (strong).** The identifier is encrypted to a key held by the sending
enclave (Nitro Enclave / confidential VM). Application code passes ciphertext to the enclave;
the enclave decrypts, hands it to SES, and returns only a delivery receipt. No operator and no
application server ever sees plaintext. Attestation is verifiable by a customer.

**(b) Tokenised delivery (weaker, cheaper).** Plaintext lives only in an isolated vault service
with its own credentials, audit log and no read API — the campaign service passes a token and
the vault sends. We *could* look, but every access is logged and alarmed.

(a) supports "we cannot see it." (b) supports "we do not see it, and we can prove we didn't."
**Only (a) justifies the wording currently in the product.**

---

## 5. What the proof actually proves

Keep the circuit boring. The statement is:

> I know `identifier` and `salt` such that `commitment == Poseidon(identifier, salt)`, and I
> control `wallet` via signature `s`, and `identifier` is well-formed.

- **Public:** `wallet`, `commitment`, domain separator
- **Private:** `identifier`, `salt`

This gives deduplication (same identifier → same commitment under a shared salt policy),
revocation (drop the row), and selective disclosure later, without revealing the value.

What the proof does **not** do — and what nobody should claim it does:

- It does not stop a collector recording what it collected.
- It does not stop a protocol correlating our "email-reachable" flag against its own CRM.
- It does not make the address unlearnable once mail is delivered — a reply, a click, a bounce
  can each reveal it to a determined operator.

---

## 6. Residual leaks to close

Cross-origin collection is necessary, not sufficient. Each of these leaks the link if ignored:

| Leak | Fix |
|---|---|
| **Reply-to** routed to the protocol's mailbox — a single reply reveals the address | Route replies through our relay; expose only a per-contact alias |
| **Click and open tracking** on the protocol's own domain | Track on our domain, hand back aggregates |
| **CSV export** including ZK-linked rows | Export the alias, never the address; block export of ZK rows entirely |
| **Test sends** to an operator-supplied address | Allowed — that is their own address, not a subscriber's |
| **Single-recipient campaigns** to one ZK contact | Enforce a k-anonymity floor per send (k ≥ 20 is a reasonable start) |
| **API read-back** of a contact | `GET /contacts/:id` must return `email: null` for ZK rows, exactly as the mock does today |

That last row is why `data/sdk.ts` already refuses email on `identify()` — same boundary, other
direction. Both must hold or neither means anything.

---

## 7. Build order

1. **Collection frame** — new origin, signed embed token, wallet signature, direct POST. Closes
   the leak the CTO identified. Largest single win; do it first.
2. **Commitment + proof** — Groth16 circuit per §5, verification on write.
3. **Sealed delivery** — enclave or vault per §4. Decide (a) vs (b) *before* building, because it
   sets what marketing may say.
4. **Leak closure** — reply relay, our-domain tracking, export rules, k-anonymity floor (§6).
5. **UI truth pass** — only now do the "ZK-protected" label and the Privacy copy become accurate.

## 8. What to say until step 5 ships

The current wording overclaims. Until the above lands, the honest version is:

> Identifiers are encrypted at rest and are not visible in OnchainSuite tooling. When you
> collect through a hosted or embedded OnchainSuite form, the address is sent directly to us and
> does not pass through your application.

That is true of a cross-origin form today. What is **not** yet true — and must not be said — is
that a protocol using an inline widget cannot see what its own page collected.
