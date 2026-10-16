import { describe, expect, it } from 'vitest';
import { IdentifyRejected, assertIdentify, assertTrack, isEmailLike } from './sdk';

/* The ZK guarantee is that operators never learn the email behind a verified contact.
   The SDK runs inside the operator's own dApp, so identify() is the one call that could
   hand them that mapping directly. These tests exist so a future "just accept email too,
   it's convenient" change fails loudly instead of quietly revoking the guarantee. */

const WALLET = '0x1A2b3C4d5E6f7890AbCdEf1234567890fEdCbA98';

describe('identify() accepts wallets', () => {
  it('takes a wallet address and trims it', () => {
    expect(assertIdentify({ wallet: `  ${WALLET}  ` })).toEqual({ wallet: WALLET });
  });

  it('allows non-identifying meta alongside the wallet', () => {
    const out = assertIdentify({ wallet: WALLET, meta: { chainId: 8453, appVersion: '2.1.0' } });
    expect(out.meta).toEqual({ chainId: 8453, appVersion: '2.1.0' });
  });
});

describe('identify() refuses personal identifiers', () => {
  it.each([
    ['email', { wallet: WALLET, email: 'holder@example.com' }],
    ['emailAddress', { wallet: WALLET, emailAddress: 'holder@example.com' }],
    ['snake_case e_mail', { wallet: WALLET, e_mail: 'holder@example.com' }],
    ['phone', { wallet: WALLET, phone: '+15550100' }],
    ['name', { wallet: WALLET, name: 'Ada' }],
    ['userId', { wallet: WALLET, userId: 'u_123' }],
  ])('rejects %s', (_label, payload) => {
    expect(() => assertIdentify(payload)).toThrow(IdentifyRejected);
  });

  it('explains why, so the caller does not just retry with another key name', () => {
    expect(() => assertIdentify({ wallet: WALLET, email: 'a@b.com' })).toThrow(/ZK guarantee/);
  });

  it('catches an email passed where the wallet belongs', () => {
    // No forbidden key is present here — only the value gives it away.
    expect(() => assertIdentify({ wallet: 'holder@example.com' })).toThrow(/never through the SDK/);
  });

  it('catches an email smuggled through meta', () => {
    expect(() => assertIdentify({ wallet: WALLET, meta: { ref: 'holder@example.com' } }))
      .toThrow(/non-identifying context only/);
  });

  it('throws rather than silently dropping the field', () => {
    // Sanitising would let the caller believe the email was stored and read back later.
    let out: unknown = 'not thrown';
    try {
      out = assertIdentify({ wallet: WALLET, email: 'a@b.com' });
    } catch {
      out = 'threw';
    }
    expect(out).toBe('threw');
  });
});

describe('identify() input validation', () => {
  it('requires a wallet', () => {
    expect(() => assertIdentify({})).toThrow(/requires a wallet/);
  });

  it('rejects a value that is not a wallet address', () => {
    expect(() => assertIdentify({ wallet: 'acme.eth' })).toThrow(/not a wallet address/);
  });

  it('rejects non-objects', () => {
    expect(() => assertIdentify(WALLET)).toThrow(/takes an object/);
    expect(() => assertIdentify(null)).toThrow(/takes an object/);
  });

  it('recognises email shapes without matching plain strings', () => {
    expect(isEmailLike('a@b.co')).toBe(true);
    expect(isEmailLike(WALLET)).toBe(false);
    expect(isEmailLike(42)).toBe(false);
  });
});

/* track() carries the same risk identify() does: it runs inside the operator's own dApp, so
   an event payload can smuggle an address just as easily as an identify payload could. These
   assert the door is the same width. */
describe('track() input validation', () => {
  it('accepts an event against a wallet', () => {
    expect(assertTrack({ event: 'completed_setup', wallet: WALLET }))
      .toEqual({ event: 'completed_setup', wallet: WALLET });
  });

  it('requires an event name and a wallet', () => {
    expect(() => assertTrack({ wallet: WALLET })).toThrow(/requires an event name/);
    expect(() => assertTrack({ event: 'completed_setup' })).toThrow(/requires the wallet/);
  });

  /* Slugifying instead would give one event two names the first time somebody writes the
     snake_case version by hand, and a segment would silently match only half the traffic. */
  it('rejects an unusable event name rather than slugifying it', () => {
    expect(() => assertTrack({ event: 'Completed Setup', wallet: WALLET })).toThrow(/not a usable event name/);
    expect(() => assertTrack({ event: '9lives', wallet: WALLET })).toThrow(/not a usable event name/);
  });

  it('refuses personal identifiers as keys, as a wallet, and inside properties', () => {
    expect(() => assertTrack({ event: 'signed_up', wallet: WALLET, email: 'a@b.co' }))
      .toThrow(/does not accept "email"/);
    expect(() => assertTrack({ event: 'signed_up', wallet: 'a@b.co' }))
      .toThrow(/received an email address/);
    expect(() => assertTrack({ event: 'signed_up', wallet: WALLET, properties: { contact: 'a@b.co' } }))
      .toThrow(/looks like an email address/);
    expect(() => assertTrack({ event: 'signed_up', wallet: WALLET, properties: { userId: 'u_1' } }))
      .toThrow(/is an identifier, not context/);
  });

  it('keeps properties to plain values', () => {
    expect(assertTrack({ event: 'placed_position', wallet: WALLET, properties: { market: 'WC26', size: 50, live: true } }).properties)
      .toEqual({ market: 'WC26', size: 50, live: true });
    expect(() => assertTrack({ event: 'placed_position', wallet: WALLET, properties: { tags: ['a'] } }))
      .toThrow(/must be a string, number or boolean/);
  });

  /* Every lifecycle stage is a recency rule, so one event dated tomorrow would hold a wallet
     in "active" indefinitely. Backfill is allowed; the future is not. */
  it('allows backfill but refuses future timestamps', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(assertTrack({ event: 'signed_up', wallet: WALLET, at: past }).at).toBe(past);
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(() => assertTrack({ event: 'signed_up', wallet: WALLET, at: future })).toThrow(/in the future/);
    expect(() => assertTrack({ event: 'signed_up', wallet: WALLET, at: 'yesterday' })).toThrow(/ISO-8601/);
  });
});
