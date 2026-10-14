import React from 'react';

const palette = ['var(--data-1)', 'var(--data-2)', 'var(--data-3)', 'var(--data-4)', 'var(--data-5)', 'var(--data-6)', 'var(--data-7)', 'var(--data-8)'];

/** Legend for multi-series Chart. Swatch colours follow the same categorical order as Chart,
    so item i here matches series i there. Clickable when onToggle is provided (for series show/hide). */
export function ChartLegend({ items = [], hidden = [], onToggle, align = 'left', style, className }) {
  return (
    <div
      className={className}
      role="list"
      style={Object.assign({
        display: 'flex', flexWrap: 'wrap', gap: '8px 18px',
        justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
        fontFamily: 'var(--font-sans)',
      }, style)}
    >
      {items.map((item, i) => {
        const it = typeof item === 'string' ? { label: item } : item;
        const color = it.color || palette[i % palette.length];
        const off = hidden.includes(i) || hidden.includes(it.label);
        const interactive = !!onToggle;
        return (
          <span
            key={i}
            role="listitem"
            onClick={interactive ? () => onToggle(i, it.label) : undefined}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              fontSize: 'var(--text-label-s-size)', fontWeight: 500, color: 'var(--text-secondary)',
              cursor: interactive ? 'pointer' : 'default', opacity: off ? 0.4 : 1,
              userSelect: 'none',
            }}
          >
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 'var(--radius-sm)', background: color, flexShrink: 0, textDecoration: off ? 'line-through' : 'none' }}></span>
            <span style={{ textDecoration: off ? 'line-through' : 'none' }}>{it.label}</span>
            {it.value != null ? <span style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{it.value}</span> : null}
          </span>
        );
      })}
    </div>
  );
}
