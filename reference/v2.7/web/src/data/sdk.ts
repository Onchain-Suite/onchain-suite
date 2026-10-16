/* The SDK identify() contract.
 *
 * This is the narrowest point in the whole product's privacy story. Operators are promised
 * they never see the email address behind a ZK-linked contact — but the SDK runs inside the
 * *operator's own* dApp, so whatever it sends us is data they chose and can see. If identify()
 * ever accepts an email, the operator has handed themselves the mapping we told them they
 * could not have, and the ZK guarantee is silently gone. No proof was broken; the address
 * just walked in through a side door.
 *
 * So the payload is wallet-only, enforced twice:
 *   - at compile time, by typing every identifier we refuse as `never`
 *   - at run time, by rejecting forbidden keys and anything email-shaped
 *
 * The runtime half matters because the SDK is called from untyped JavaScript in the wild,
 * where the compile-time half does not exist. Both halves must ship to the backend too:
 * this file is the reference the server-side /v1/identify handler should mirror. */

/** Identifiers that must never reach us. Typed as `never` so passing one fails to compile. */
export interface IdentifyPayload {
  /** The connected wallet address. The only identity the SDK may report. */
  wallet: string;
  /** Optional non-identifying context: chain id, app version, locale. */
  meta?: Record<string, string | number | boolean>;

  email?: never;
  emailAddress?: never;
  mail?: never;
  phone?: never;
  phoneNumber?: never;
  name?: never;
  userId?: never;
  identity?: never;
}

/** Checked at run time, where types don't exist. Keep in sync with the `never` fields above. */
export const FORBIDDEN_IDENTIFY_KEYS = [
  'email', 'emailaddress', 'mail', 'e_mail', 'phone', 'phonenumber', 'tel',
  'name', 'fullname', 'username', 'userid', 'identity', 'contact',
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

export const isEmailLike = (v: unknown): boolean => typeof v === 'string' && EMAIL_RE.test(v.trim());

export class IdentifyRejected extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = 'IdentifyRejected';
  }
}

/** Validate an identify() call. Throws rather than sanitising: silently dropping an email
 *  would let a caller believe it was stored, and the next release might "fix" that. */
export function assertIdentify(input: unknown): IdentifyPayload {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new IdentifyRejected('identify() takes an object like { wallet }.');
  }
  const obj = input as Record<string, unknown>;

  for (const key of Object.keys(obj)) {
    if ((FORBIDDEN_IDENTIFY_KEYS as readonly string[]).includes(key.toLowerCase().replace(/[-_]/g, ''))) {
      throw new IdentifyRejected(`identify() does not accept "${key}". Wallet addresses only. Sending personal identifiers here would defeat the ZK guarantee shown to your subscribers.`);
    }
  }

  const { wallet } = obj;
  if (typeof wallet !== 'string' || !wallet.trim()) {
    throw new IdentifyRejected('identify() requires a wallet address.');
  }
  // Catch an email passed positionally as the wallet, which no key check would see.
  if (isEmailLike(wallet)) {
    throw new IdentifyRejected('identify() received an email address where a wallet was expected. Link emails through a form or ZK proof, never through the SDK.');
  }
  if (!WALLET_RE.test(wallet.trim())) {
    throw new IdentifyRejected(`"${wallet}" is not a wallet address.`);
  }

  // `meta` is for context, not a smuggling route for the identifiers blocked above.
  const meta = obj.meta;
  if (meta !== undefined) {
    if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) {
      throw new IdentifyRejected('identify() meta must be an object of plain values.');
    }
    for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
      if (isEmailLike(v)) {
        throw new IdentifyRejected(`identify() meta."${k}" looks like an email address. Meta is for non-identifying context only.`);
      }
    }
  }

  return { wallet: wallet.trim(), ...(meta ? { meta: meta as IdentifyPayload['meta'] } : {}) } as IdentifyPayload;
}

/* ---------------------------------------------------------------------------------------- *
 * track() — the product lane.
 *
 * The plan sells a join across two lanes: what a customer does on the chain, and what they do
 * inside the company's own application. The chain half has been readable since the contracts
 * went into Data; the product half had no door at all. identify() says a wallet exists, and
 * nothing said what it then did — so "signed up but has not placed a position" and "completed
 * setup and has not staked in 30 days" were unaskable, and those are the examples the whole
 * product is argued from.
 *
 * track() is that door, and it inherits identify()'s rule without softening it. The SDK still
 * runs inside the operator's dApp, so an event payload is just as capable of carrying an email
 * as an identify payload was. Event names are the operator's own vocabulary; properties are
 * context. Neither may carry an identifier we promised the operator they would never hold.
 * ---------------------------------------------------------------------------------------- */

export type EventValue = string | number | boolean;

export interface TrackPayload {
  /** The operator's own event name — "completed_setup", "placed_position". */
  event: string;
  /** Who did it. Wallet-only, for exactly the reason identify() is. */
  wallet: string;
  /** Non-identifying context: amount, market, plan, step number. */
  properties?: Record<string, EventValue>;
  /** When it happened, ISO-8601. Defaults to arrival time; pass it to backfill. */
  at?: string;

  email?: never;
  emailAddress?: never;
  phone?: never;
  name?: never;
  userId?: never;
}

/** Event names have to survive being a segment rule, a Loop trigger and a column header. */
const EVENT_NAME_RE = /^[a-z][a-z0-9_]{1,62}$/;

export class TrackRejected extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = 'TrackRejected';
  }
}

export function assertTrack(input: unknown): Required<Pick<TrackPayload, 'event' | 'wallet'>> & Pick<TrackPayload, 'properties' | 'at'> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TrackRejected('track() takes an object like { event, wallet }.');
  }
  const obj = input as Record<string, unknown>;

  for (const key of Object.keys(obj)) {
    if ((FORBIDDEN_IDENTIFY_KEYS as readonly string[]).includes(key.toLowerCase().replace(/[-_]/g, ''))) {
      throw new TrackRejected(`track() does not accept "${key}". Events are attached to a wallet; sending personal identifiers here would defeat the ZK guarantee shown to your subscribers.`);
    }
  }

  const { event, wallet } = obj;
  if (typeof event !== 'string' || !event.trim()) {
    throw new TrackRejected('track() requires an event name.');
  }
  /* Rejected rather than slugified. A caller who sends "Completed Setup" and gets
     "completed_setup" back has two names for one event the first time someone writes the
     snake_case version by hand, and segments silently split across both. */
  if (!EVENT_NAME_RE.test(event.trim())) {
    throw new TrackRejected(`"${event}" is not a usable event name. Use lower case, digits and underscores, starting with a letter, for example "completed_setup".`);
  }
  if (typeof wallet !== 'string' || !wallet.trim()) {
    throw new TrackRejected('track() requires the wallet the event belongs to.');
  }
  if (isEmailLike(wallet)) {
    throw new TrackRejected('track() received an email address where a wallet was expected. Link emails through a form or ZK proof, never through the SDK.');
  }
  if (!WALLET_RE.test(wallet.trim())) {
    throw new TrackRejected(`"${wallet}" is not a wallet address.`);
  }

  const properties = obj.properties;
  if (properties !== undefined) {
    if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) {
      throw new TrackRejected('track() properties must be an object of plain values.');
    }
    for (const [k, v] of Object.entries(properties as Record<string, unknown>)) {
      if (isEmailLike(v)) {
        throw new TrackRejected(`track() properties."${k}" looks like an email address. Properties are for non-identifying context only.`);
      }
      if ((FORBIDDEN_IDENTIFY_KEYS as readonly string[]).includes(k.toLowerCase().replace(/[-_]/g, ''))) {
        throw new TrackRejected(`track() properties."${k}" is an identifier, not context.`);
      }
      if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') {
        throw new TrackRejected(`track() properties."${k}" must be a string, number or boolean.`);
      }
    }
  }

  const at = obj.at;
  if (at !== undefined) {
    if (typeof at !== 'string' || Number.isNaN(Date.parse(at))) {
      throw new TrackRejected('track() at must be an ISO-8601 timestamp.');
    }
    /* A backfill of tomorrow's events would make a recency rule read as active forever, and
       every lifecycle stage downstream depends on recency. */
    if (Date.parse(at) > Date.now() + 60_000) {
      throw new TrackRejected('track() at is in the future. Events can be backfilled, not predicted.');
    }
  }

  return {
    event: event.trim(),
    wallet: wallet.trim(),
    ...(properties ? { properties: properties as Record<string, EventValue> } : {}),
    ...(at ? { at } : {}),
  };
}
