import React from 'react';

const css = `
@keyframes os-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
.os-skel{border-radius:var(--radius-sm);background:linear-gradient(90deg,var(--surface-subtle) 25%,var(--surface-hover) 50%,var(--surface-subtle) 75%);
  background-size:200% 100%;animation:os-shimmer 1.6s linear infinite;}
@media (prefers-reduced-motion: reduce){.os-skel{animation:none;background:var(--surface-subtle);}}
.os-skel--circle{border-radius:var(--radius-round);}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-skel-css')) {
  const s = document.createElement('style'); s.id = 'os-skel-css'; s.textContent = css; document.head.appendChild(s);
}

/** Loading placeholder mirroring exact final geometry — no layout shift. */
export function Skeleton({ width = '100%', height = 16, circle = false, style, className }) {
  return (
    <span
      className={`os-skel${circle ? ' os-skel--circle' : ''}${className ? ' ' + className : ''}`}
      aria-hidden="true"
      style={Object.assign({ display: 'block', width, height }, style)}
    ></span>
  );
}
