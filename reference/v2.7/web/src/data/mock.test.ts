import { describe, expect, it } from 'vitest';
import { CONTACTS, LISTS, TAGS, contactsInList, contactsWithTag, listCount, tagCount } from './mock';

describe('mock data integrity', () => {
  it('generates a stable, non-empty contact set with valid wallet addresses', () => {
    expect(CONTACTS.length).toBe(48);
    const withWallet = CONTACTS.filter((c) => c.address !== null);
    expect(withWallet.every((c) => c.address!.startsWith('0x') && c.address!.length === 42)).toBe(true);
  });

  it('supports wallet-less (email-only) contacts captured before a wallet links', () => {
    const noWallet = CONTACTS.filter((c) => c.address === null);
    expect(noWallet.length).toBeGreaterThan(0);
    for (const c of noWallet) {
      expect(c.reachable).toContain('email'); // still reachable
      expect(c.email).toBeTruthy(); // they gave their address, so it's visible
      expect(c.zkVerified).toBe(false);
    }
  });

  it('never exposes an address for ZK-protected contacts (privacy invariant)', () => {
    for (const c of CONTACTS) {
      // A visible email must belong to a non-ZK (imported) contact.
      if (c.email) expect(c.zkVerified).toBe(false);
      // A ZK-verified, email-reachable contact must NOT carry a visible address.
      if (c.zkVerified && c.reachable.includes('email')) expect(c.email).toBeNull();
      // No address without email-reachability.
      if (c.email) expect(c.reachable).toContain('email');
    }
  });

  it('has both ZK-protected and imported (visible-email) contacts to exercise the rule', () => {
    expect(CONTACTS.some((c) => c.reachable.includes('email') && c.email === null)).toBe(true);
    expect(CONTACTS.some((c) => c.email !== null)).toBe(true);
  });

  it('list membership is queryable and counts match', () => {
    for (const l of LISTS) {
      const members = contactsInList(l.id);
      expect(listCount(l.id)).toBe(members.length);
      expect(members.every((m) => m.listIds.includes(l.id))).toBe(true);
    }
  });

  it('tag membership is queryable and counts match', () => {
    for (const t of TAGS) {
      const tagged = contactsWithTag(t.id);
      expect(tagCount(t.id)).toBe(tagged.length);
      expect(tagged.every((m) => m.tags.includes(t.id))).toBe(true);
    }
  });

  it('every list has at least one member (so drill-down is never empty)', () => {
    for (const l of LISTS) expect(contactsInList(l.id).length).toBeGreaterThan(0);
  });
});
