import React from 'react';
import { Icon } from '../icons/Icon.jsx';
import { Button } from '../actions/Button.jsx';

const css = `
.os-trigger{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);
  padding:14px 16px;display:flex;flex-direction:column;gap:10px;font-family:var(--font-sans);box-sizing:border-box;}
.os-trigger__head{display:flex;align-items:center;gap:8px;font-size:var(--text-label-s-size);font-weight:500;
  letter-spacing:0.2px;text-transform:uppercase;color:var(--text-secondary);}
.os-trigger__cond{font-size:var(--text-body-s-size);line-height:22px;color:var(--text-secondary);}
.os-trigger__chip{display:inline-block;padding:1px 7px;margin:0 2px;border-radius:var(--radius-sm);background:var(--bg-brand-subtle);
  color:var(--blue-700);font-weight:500;cursor:pointer;}
.os-trigger__chip:hover{background:var(--blue-50);}
.os-trigger__foot{display:flex;align-items:center;gap:12px;}
.os-trigger__count{font-size:var(--text-caption-size);color:var(--text-tertiary);margin-left:auto;font-variant-numeric:tabular-nums;}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-trigger-css')) {
  const s = document.createElement('style'); s.id = 'os-trigger-css'; s.textContent = css; document.head.appendChild(s);
}

/** Trigger card: condition summary in structured prose with editable operand chips. */
export function TriggerCard({ icon = 'zap', parts = [], fires, spark = [], onTest, style, className }) {
  return (
    <div className={`os-trigger${className ? ' ' + className : ''}`} style={style}>
      <div className="os-trigger__head"><Icon name={icon} size={16} />Trigger</div>
      <div className="os-trigger__cond">
        {parts.map((p, i) =>
          typeof p === 'string'
            ? <span key={i}>{p}</span>
            : <button key={i} type="button" className="os-trigger__chip" style={{ border: 'none', font: 'inherit' }} onClick={p.onEdit}>{p.chip}</button>
        )}
      </div>
      <div className="os-trigger__foot">
        {onTest ? <Button variant="secondary" size="s" icon="zap" onClick={onTest}>Test trigger</Button> : null}
        {spark.length > 1 ? (
          <svg width="72" height="20" viewBox="0 0 72 20" aria-hidden="true">
            <polyline fill="none" stroke="var(--data-1)" strokeWidth="1.5"
              points={spark.map((v, i) => {
                const min = Math.min.apply(null, spark), max = Math.max.apply(null, spark);
                const y = max === min ? 10 : 18 - ((v - min) / (max - min)) * 16;
                return (i / (spark.length - 1)) * 72 + ',' + y.toFixed(1);
              }).join(' ')} />
          </svg>
        ) : null}
        {fires != null ? <span className="os-trigger__count">{fires} fires · 7d</span> : null}
      </div>
    </div>
  );
}
