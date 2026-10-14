import React from 'react';

const STATES = {
  thriving: { color: 'var(--green-500)', segments: 5 },
  healthy: { color: 'var(--sky-500)', segments: 4 },
  cooling: { color: 'var(--neutral-400)', segments: 3 },
  'at-risk': { color: 'var(--orange-500)', segments: 2 },
  churned: { color: 'var(--neutral-300)', segments: 1 },
};

/** 5-segment arc gauge (echoing the brand arc motif) for engagement health. Always labelled. */
export function WalletHealthIndicator({ state = 'healthy', size = 40, showLabel = true, style, className }) {
  const conf = STATES[state] || STATES.healthy;
  const segs = [];
  const r = 15.5, cx = 18, cy = 18;
  // 5 arc segments over 270°, starting at 135°
  for (let i = 0; i < 5; i++) {
    const a0 = ((135 + i * 54 + 3) * Math.PI) / 180;
    const a1 = ((135 + (i + 1) * 54 - 3) * Math.PI) / 180;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    segs.push(
      <path
        key={i}
        d={`M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`}
        fill="none"
        stroke={i < conf.segments ? conf.color : 'var(--neutral-100)'}
        strokeWidth="4"
        strokeLinecap="round"
      />
    );
  }
  const label = state.charAt(0).toUpperCase() + state.slice(1).replace('-r', ' r');
  return (
    <span className={className} style={Object.assign({ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-sans)' }, style)}>
      <svg width={size} height={size} viewBox="0 0 36 36" role="img" aria-label={`Wallet health: ${label}`}>{segs}</svg>
      {showLabel ? <span style={{ fontSize: 'var(--text-label-s-size)', fontWeight: 500, color: conf.color === 'var(--neutral-300)' ? 'var(--text-tertiary)' : conf.color }}>{label}</span> : null}
    </span>
  );
}
