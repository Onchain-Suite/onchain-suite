import React from 'react';
import { Button } from '../actions/Button.jsx';
import { IconButton } from '../actions/IconButton.jsx';

const css = `
.os-modal-scrim{position:fixed;inset:0;background:var(--bg-overlay);backdrop-filter:blur(var(--blur-overlay));
  display:flex;align-items:center;justify-content:center;z-index:var(--z-overlay);}
.os-modal{background:var(--bg-raised);border-radius:var(--radius-lg);box-shadow:var(--elevation-3);
  display:flex;flex-direction:column;max-height:85vh;font-family:var(--font-sans);z-index:var(--z-modal);}
.os-modal__head{display:flex;align-items:center;gap:12px;padding:20px 24px 0;}
.os-modal__title{flex:1;font-size:var(--text-heading-l-size);line-height:var(--text-heading-l-line);font-weight:600;letter-spacing:-0.25px;color:var(--text-primary);margin:0;}
.os-modal__body{padding:16px 24px;overflow-y:auto;font-size:var(--text-body-m-size);line-height:var(--text-body-m-line);color:var(--text-secondary);}
.os-modal__foot{display:flex;justify-content:flex-end;gap:10px;padding:0 24px 20px;}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-modal-css')) {
  const s = document.createElement('style'); s.id = 'os-modal-css'; s.textContent = css; document.head.appendChild(s);
}

const widths = { s: 480, m: 640, l: 800 };

/** Interrupting decision ≤1 screen. Flows longer than 2 steps get a page, not a modal. */
export function Modal({ open = true, title, children, size = 's', primaryLabel, onPrimary, primaryVariant = 'primary', secondaryLabel = 'Cancel', onClose, inline = false, style, className }) {
  if (!open) return null;
  const panel = (
    <div className={`os-modal${className ? ' ' + className : ''}`} role="dialog" aria-modal="true" aria-label={title} style={Object.assign({ width: widths[size] || size, maxWidth: '92vw' }, style)}>
      <div className="os-modal__head">
        <h2 className="os-modal__title">{title}</h2>
        <IconButton icon="x" label="Close" onClick={onClose} />
      </div>
      <div className="os-modal__body">{children}</div>
      {(primaryLabel || secondaryLabel) ? (
        <div className="os-modal__foot">
          {secondaryLabel ? <Button variant="secondary" onClick={onClose}>{secondaryLabel}</Button> : null}
          {primaryLabel ? <Button variant={primaryVariant} onClick={onPrimary}>{primaryLabel}</Button> : null}
        </div>
      ) : null}
    </div>
  );
  if (inline) return panel;
  return <div className="os-modal-scrim" onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>{panel}</div>;
}
