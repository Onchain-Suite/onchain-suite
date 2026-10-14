import React from 'react';
import { IconButton } from '../actions/IconButton.jsx';

const css = `
.os-drawer-scrim{position:fixed;inset:0;background:var(--bg-overlay);z-index:var(--z-overlay);display:flex;justify-content:flex-end;}
.os-drawer{background:var(--bg-raised);border-left:1px solid var(--border-default);box-shadow:var(--elevation-3);
  height:100%;display:flex;flex-direction:column;font-family:var(--font-sans);box-sizing:border-box;}
.os-drawer__head{display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid var(--border-subtle);}
.os-drawer__title{flex:1;font-size:var(--text-heading-m-size);line-height:var(--text-heading-m-line);font-weight:600;color:var(--text-primary);margin:0;}
.os-drawer__body{flex:1;overflow-y:auto;padding:16px 20px;font-size:var(--text-body-s-size);line-height:var(--text-body-s-line);color:var(--text-secondary);}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-drawer-css')) {
  const s = document.createElement('style'); s.id = 'os-drawer-css'; s.textContent = css; document.head.appendChild(s);
}

/** Right-side inspect/edit surface — the default detail surface (wallet profile, event payload). */
export function Drawer({ open = true, title, children, width = 480, onClose, inline = false, style, className }) {
  if (!open) return null;
  const panel = (
    <div className={`os-drawer${className ? ' ' + className : ''}`} role="dialog" aria-label={title} style={Object.assign({ width, maxWidth: '92vw' }, style)}>
      <div className="os-drawer__head">
        <h2 className="os-drawer__title">{title}</h2>
        <IconButton icon="x" label="Close" onClick={onClose} />
      </div>
      <div className="os-drawer__body">{children}</div>
    </div>
  );
  if (inline) return panel;
  return <div className="os-drawer-scrim" onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>{panel}</div>;
}
