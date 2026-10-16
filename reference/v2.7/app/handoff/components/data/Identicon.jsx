import React from 'react';

const HUES = ['var(--blue-600)', 'var(--sky-500)', 'var(--blue-800)', 'var(--sky-700)', 'var(--navy-800)', 'var(--blue-400)'];

/** Deterministic geometric identicon generated from a wallet address, quantized to brand hues.
    Always pair with the truncated address — identicons alone are not identifiers. */
export function Identicon({ address = '', size = 32, style, className }) {
  // Simple deterministic hash of the address
  let h = 0;
  for (let i = 0; i < address.length; i++) h = (Math.imul(h, 31) + address.charCodeAt(i)) | 0;
  const rnd = (n) => { h = (Math.imul(h, 1103515245) + 12345) | 0; return ((h >>> 16) & 0x7fff) % n; };
  const bg = HUES[rnd(HUES.length)];
  const fg = HUES[rnd(HUES.length - 1) + 1 === HUES.indexOf(bg) ? 0 : rnd(HUES.length)];
  // 5x5 symmetric grid
  const cells = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      if (rnd(2)) { cells.push([x, y]); if (x < 2) cells.push([4 - x, y]); }
    }
  }
  return (
    <span
      className={className}
      aria-hidden="true"
      style={Object.assign({
        width: size, height: size, borderRadius: 'var(--radius-round)', overflow: 'hidden',
        display: 'inline-flex', flexShrink: 0, background: 'var(--surface-tint)',
      }, style)}
    >
      <svg width={size} height={size} viewBox="0 0 5 5" shapeRendering="crispEdges">
        {cells.map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="1" height="1" fill={i % 5 === 0 ? fg : bg} />
        ))}
      </svg>
    </span>
  );
}
