import { describe, expect, it } from 'vitest';
import { ensureFooter, footerBlocks, missingRequiredTags, renderTags, REQUIRED_TAGS } from './email';

describe('email compliance footer', () => {
  it('appends the footer to any template, including an empty one', () => {
    expect(ensureFooter([]).map((b) => b.id)).toEqual(['sys-divider', 'sys-footer']);
  });

  it('keeps the footer last no matter what the body contains', () => {
    const body = [{ id: 'b1', type: 'heading' }, { id: 'b2', type: 'text' }];
    const out = ensureFooter(body);
    expect(out[out.length - 1].id).toBe('sys-footer');
  });

  it('never duplicates the footer when applied repeatedly', () => {
    const once = ensureFooter([{ id: 'b1', type: 'text' }]);
    const twice = ensureFooter(once);
    expect(twice.filter((b) => b.id === 'sys-footer')).toHaveLength(1);
  });

  it('survives an import that would otherwise replace every block', () => {
    // Import HTML hands back a fresh body — the footer must be re-attached.
    const imported = [{ id: 'i1', type: 'heading' }, { id: 'i2', type: 'text' }];
    expect(ensureFooter(imported).some((b) => b.id === 'sys-footer')).toBe(true);
  });

  it('ships every legally required merge tag in the default footer', () => {
    const text = footerBlocks().map((b) => b.text ?? '').join('\n');
    for (const tag of REQUIRED_TAGS) expect(text).toContain(tag);
    expect(missingRequiredTags(text)).toEqual([]);
  });

  it('reports which required tags are missing when a user strips them', () => {
    expect(missingRequiredTags('just some body copy')).toEqual(REQUIRED_TAGS);
  });

  it('resolves merge tags to sample values for preview', () => {
    expect(renderTags('Hi {{first_name}} — {{sender_name}}')).toBe('Hi Jordan — Acme');
    expect(renderTags('{{unsubscribe_url}}')).toContain('https://');
  });
});
