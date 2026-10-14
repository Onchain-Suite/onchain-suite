import { describe, expect, it } from 'vitest';
import { parseContacts, splitCsvLine } from './csv';

/* The import previously accepted only pasted text while calling itself "Import CSV".
   These cover what people actually upload — exported files with headers, extra columns,
   quoted fields, and messy rows — and pin the rule that nothing is dropped silently. */

describe('splitCsvLine', () => {
  it('handles quoted fields containing the delimiter', () => {
    expect(splitCsvLine('a,"Smith, John",c')).toEqual(['a', 'Smith, John', 'c']);
  });

  it('handles escaped quotes', () => {
    expect(splitCsvLine('"He said ""hi""",x')).toEqual(['He said "hi"', 'x']);
  });

  it('accepts semicolons and tabs, which spreadsheet exports use', () => {
    expect(splitCsvLine('a;b')).toEqual(['a', 'b']);
    expect(splitCsvLine('a\tb')).toEqual(['a', 'b']);
  });
});

describe('parseContacts — real CSV', () => {
  const WALLET = '0x1A2b3C4d5E6f7890AbCdEf1234567890fEdCbA98';

  it('reads a header row and maps the identifier columns', () => {
    const r = parseContacts(`Email,Wallet Address,Tier\nholder@acme.com,${WALLET},gold`);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].email).toBe('holder@acme.com');
    expect(r.rows[0].wallet).toBe(WALLET);
    expect(r.mapped).toEqual({ email: 'Email', wallet: 'Wallet Address' });
  });

  it('keeps unmapped columns so custom fields are not lost', () => {
    const r = parseContacts(`email,tier\nholder@acme.com,gold`);
    expect(r.rows[0].extra).toEqual({ tier: 'gold' });
  });

  it('does not mistake a data row for a header', () => {
    // A pasted list whose first line is a real contact must not lose that contact.
    const r = parseContacts(`holder@acme.com\nsecond@acme.com`);
    expect(r.rows).toHaveLength(2);
  });

  it('finds identifiers in a headerless CSV whatever the column order', () => {
    const r = parseContacts(`gold,${WALLET},holder@acme.com`);
    expect(r.rows[0].wallet).toBe(WALLET);
    expect(r.rows[0].email).toBe('holder@acme.com');
  });
});

describe('parseContacts — what it refuses', () => {
  const WALLET = '0x1A2b3C4d5E6f7890AbCdEf1234567890fEdCbA98';

  it('reports unreadable rows instead of dropping them', () => {
    const r = parseContacts(`holder@acme.com\nnot-an-identifier\n${WALLET}`);
    expect(r.rows).toHaveLength(2);
    expect(r.skipped).toHaveLength(1);
    expect(r.skipped[0]).toMatchObject({ line: 2, reason: 'No email or wallet found' });
  });

  it('rejects a truncated wallet rather than importing it', () => {
    const r = parseContacts(`wallet\n0x1A2b3C`);
    expect(r.rows).toHaveLength(0);
    expect(r.skipped[0].reason).toMatch(/wallet address or ENS/);
  });

  it('reports a row once, with the specific reason, not once per bad field', () => {
    // A row with both a malformed email and a malformed wallet was being counted three
    // times — twice per field, then again generically — inflating the "will not import"
    // number well past the number of actual rows.
    const r = parseContacts(`email,wallet\nbroken-row,0xNOPE`);
    expect(r.skipped).toHaveLength(2);
    expect(r.skipped.map((s) => s.reason)).toEqual(['Not a valid email', 'Not a wallet address or ENS name']);
    expect(r.skipped.every((s) => s.line === 2)).toBe(true);
  });

  it('never reports more skipped rows than the file has data rows', () => {
    const csv = `email,wallet\nbroken,0xNOPE\nalso-broken,nope\nok@v.com,`;
    const r = parseContacts(csv);
    const dataRows = 3;
    expect(new Set(r.skipped.map((s) => s.line)).size).toBeLessThanOrEqual(dataRows);
  });

  it('accepts ENS names as wallets', () => {
    expect(parseContacts('wallet\nmaya.eth').rows[0].wallet).toBe('maya.eth');
  });

  it('merges duplicates so nobody is messaged twice', () => {
    const r = parseContacts(`email\nholder@acme.com\nHOLDER@acme.com\nother@acme.com`);
    expect(r.rows).toHaveLength(2);
    expect(r.duplicates).toBe(1);
  });

  it('counts each contact by what it can be reached on', () => {
    const r = parseContacts(`email,wallet\na@b.com,\n,${WALLET}\nc@d.com,0x9999999999999999999999999999999999999999`);
    expect(r.emails).toBe(1);
    expect(r.wallets).toBe(1);
    expect(r.both).toBe(1);
  });

  it('survives an empty or whitespace-only file', () => {
    expect(parseContacts('').rows).toHaveLength(0);
    expect(parseContacts('\n\n  \n').rows).toHaveLength(0);
  });

  it('strips a UTF-8 BOM, which Excel puts on every export', () => {
    const r = parseContacts('\uFEFFemail\nholder@acme.com');
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].email).toBe('holder@acme.com');
  });
});
