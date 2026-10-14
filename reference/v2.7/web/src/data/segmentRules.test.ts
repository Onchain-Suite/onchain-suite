import { describe, expect, it } from 'vitest';
import { ATTRIBUTE_FIELDS, EVENT_FIELDS, countPredicates, isEventField, opMeta, treeFromQueryRules, type Predicate } from './segmentRules';
import { runQuery } from './queries';

const preds = (g: ReturnType<typeof treeFromQueryRules>): Predicate[] =>
  g.children.filter((n): n is Predicate => n.kind === 'predicate');

/* This is the bridge from a question someone typed to the rules that decide who gets
 * messaged. A silent mistranslation here targets a different set of wallets than the operator
 * asked for, which is the most expensive wrong answer the product can give. */
describe('treeFromQueryRules', () => {
  it('translates the operators a query can produce', () => {
    const t = treeFromQueryRules([
      { field: 'Wallet balance', op: 'is greater than', val: '10' },
      { field: 'Gas spent', op: 'is less than', val: '2' },
      { field: 'Tag', op: 'equals', val: 'whale' },
    ]);
    expect(preds(t).map((p) => p.op)).toEqual(['gt', 'lt', 'eq']);
    expect(preds(t).map((p) => p.value)).toEqual(['10', '2', 'whale']);
  });

  it('carries the window on an event rule rather than leaving it in the value', () => {
    const t = treeFromQueryRules([{ field: 'Email opened', op: 'is within', val: '30 days' }]);
    const p = preds(t)[0];
    expect(p.op).toBe('did');
    expect(p.windowDays).toBe(30);
    // The subject of an event predicate is the event, so the window must not also sit in the
    // value — a predicate reading "did Email opened = 30 days" matches nobody.
    expect(p.value).toBe('');
  });

  it('reads the window out of whatever wording the query used', () => {
    expect(preds(treeFromQueryRules([{ field: 'Staked', op: 'is within', val: '7 days' }]))[0].windowDays).toBe(7);
    expect(preds(treeFromQueryRules([{ field: 'Staked', op: 'is within', val: 'last 90 days' }]))[0].windowDays).toBe(90);
    // No number to find — fall back to the default rather than NaN, which would render blank
    // and silently match everything.
    expect(preds(treeFromQueryRules([{ field: 'Staked', op: 'is within', val: 'recently' }]))[0].windowDays).toBe(30);
  });

  it('guesses by field type when the operator is one it has never seen', () => {
    const ev = preds(treeFromQueryRules([{ field: 'Staked', op: 'happened during', val: 'x' }]))[0];
    const attr = preds(treeFromQueryRules([{ field: 'Tag', op: 'happened during', val: 'x' }]))[0];
    expect(isEventField('Staked')).toBe(true);
    expect(ev.op).toBe('did');
    expect(attr.op).toBe('eq');
  });

  it('keeps every rule it was given, in order', () => {
    const rules = [
      { field: 'Wallet balance', op: 'is greater than', val: '1' },
      { field: 'Email opened', op: 'is within', val: '30 days' },
      { field: 'Email clicked', op: 'equals', val: '0' },
    ];
    const t = treeFromQueryRules(rules);
    expect(countPredicates(t)).toBe(3);
    // Same rules, same order, in the builder's own names for those fields.
    expect(preds(t).map((p) => p.field)).toEqual(['Wallet balance', 'Opened an email', 'Clicked an email']);
  });

  it('gives every predicate a distinct id, so editing one cannot edit another', () => {
    const t = treeFromQueryRules([
      { field: 'Staked', op: 'is within', val: '7 days' },
      { field: 'Staked', op: 'is within', val: '30 days' },
    ]);
    const [a, b] = preds(t);
    expect(a.id).not.toBe(b.id);
  });

  it('returns a usable tree for a query with no rules at all', () => {
    const t = treeFromQueryRules([]);
    // An empty group would render as a builder with nothing in it and no way to start.
    expect(t.kind).toBe('group');
    expect(countPredicates(t)).toBe(1);
  });

  it('joins with AND, because a query describes one audience', () => {
    expect(treeFromQueryRules([{ field: 'Tag', op: 'equals', val: 'a' }]).op).toBe('and');
  });
});

/* A question's answer becomes a segment's rules. A field name the builder does not list
   rendered as the dropdown's first option, so "Token held is $VAULT" showed as "Wallet
   balance is $VAULT" while the summary underneath said otherwise. */
describe('rules generated from a question', () => {
  const questions = ['Who opened but never clicked?', 'Wallets active in the last 30 days', 'Top holders by token'];

  it('only ever uses fields and operators the builder can show', () => {
    for (const q of questions) {
      const rules = runQuery(q).segment.rules;
      expect(rules.length, q).toBeGreaterThan(0);
      for (const n of treeFromQueryRules(rules).children as Predicate[]) {
        expect([...ATTRIBUTE_FIELDS, ...EVENT_FIELDS], `${q}: ${n.field}`).toContain(n.field);
        // An event takes an event operator and an attribute takes an attribute one.
        expect(opMeta(n.op).event, `${q}: ${n.field} ${n.op}`).toBe(isEventField(n.field));
      }
    }
  });

  it('reads "clicked equals 0" as has NOT clicked', () => {
    const tree = treeFromQueryRules([{ field: 'Email clicked', op: 'equals', val: '0' }]);
    expect(tree.children[0]).toMatchObject({ field: 'Clicked an email', op: 'did_not' });
  });
});
