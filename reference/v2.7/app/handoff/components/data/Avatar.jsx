import React from 'react';

/** People avatar: image or initials, always circular. Wallets use Identicon instead. */
export function Avatar({ src, name = '', size = 32, style, className }) {
  const initials = name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const base = {
    width: size, height: size, borderRadius: 'var(--radius-round)', flexShrink: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: Math.round(size * 0.38),
    background: 'var(--blue-100)', color: 'var(--blue-700)', overflow: 'hidden',
  };
  return (
    <span className={className} style={Object.assign(base, style)} aria-label={name || undefined}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials || '?'}
    </span>
  );
}
