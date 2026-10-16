import React from 'react';

const css = `
.os-progress{display:flex;flex-direction:column;gap:6px;font-family:var(--font-sans);}
.os-progress__meta{display:flex;justify-content:space-between;font-size:var(--text-caption-size);color:var(--text-secondary);}
.os-progress__track{height:6px;border-radius:var(--radius-sm);background:var(--neutral-100);overflow:hidden;}
.os-progress__fill{height:100%;border-radius:inherit;background:var(--orange-500);transition:width var(--duration-base) var(--ease-standard);}
@keyframes os-progress-slide{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}
.os-progress__fill--indeterminate{width:25%;animation:os-progress-slide 1.2s var(--ease-standard) infinite;}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-progress-css')) {
  const s = document.createElement('style'); s.id = 'os-progress-css'; s.textContent = css; document.head.appendChild(s);
}

/** Determinate bar for known work (imports, backfills); indeterminate only for <3s unknowns. */
export function Progress({ value, label, detail, style, className }) {
  const indeterminate = value == null;
  return (
    <div className={`os-progress${className ? ' ' + className : ''}`} style={style}>
      {(label || detail) ? (
        <div className="os-progress__meta"><span>{label}</span><span>{detail}</span></div>
      ) : null}
      <div className="os-progress__track" role="progressbar" aria-valuenow={indeterminate ? undefined : value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`os-progress__fill${indeterminate ? ' os-progress__fill--indeterminate' : ''}`} style={indeterminate ? undefined : { width: value + '%' }}></div>
      </div>
    </div>
  );
}
