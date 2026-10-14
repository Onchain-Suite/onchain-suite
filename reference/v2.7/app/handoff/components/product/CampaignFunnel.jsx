import React from 'react';
import { Badge } from '../feedback/Badge.jsx';

const css = `
.os-funnel{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);
  padding:16px 20px;display:flex;flex-direction:column;gap:12px;font-family:var(--font-sans);box-sizing:border-box;}
.os-funnel__head{display:flex;align-items:center;gap:10px;}
.os-funnel__title{flex:1;font-size:var(--text-heading-m-size);font-weight:600;color:var(--text-primary);}
.os-funnel__rows{display:flex;flex-direction:column;gap:8px;}
.os-funnel__row{display:grid;grid-template-columns:150px 1fr 84px;align-items:center;gap:10px;}
.os-funnel__label{font-size:var(--text-body-s-size);color:var(--text-secondary);}
.os-funnel__track{height:16px;border-radius:var(--radius-sm);background:var(--surface-subtle);overflow:hidden;}
.os-funnel__fill{height:100%;border-radius:inherit;transition:width var(--duration-deliberate) var(--ease-standard);}
.os-funnel__val{font-size:var(--text-body-s-size);font-variant-numeric:tabular-nums;text-align:right;color:var(--text-primary);}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-funnel-css')) {
  const s = document.createElement('style'); s.id = 'os-funnel-css'; s.textContent = css; document.head.appendChild(s);
}

const stageColors = ['var(--data-1)', 'var(--data-2)', 'var(--data-5)', 'var(--data-3)'];

/** Campaign performance funnel: Sent → Delivered → Engaged → Converted on-chain (first-class stage). */
export function CampaignFunnel({ title = 'Campaign performance', status = 'success', statusLabel = 'Active', stages = [], style, className }) {
  const max = Math.max.apply(null, stages.map((s) => s.value).concat([1]));
  return (
    <div className={`os-funnel${className ? ' ' + className : ''}`} style={style}>
      <div className="os-funnel__head">
        <span className="os-funnel__title">{title}</span>
        <Badge status={status}>{statusLabel}</Badge>
      </div>
      <div className="os-funnel__rows">
        {stages.map((s, i) => (
          <div className="os-funnel__row" key={s.label}>
            <span className="os-funnel__label">{s.label}</span>
            <span className="os-funnel__track"><span className="os-funnel__fill" style={{ width: (s.value / max) * 100 + '%', background: stageColors[i % stageColors.length] }}></span></span>
            <span className="os-funnel__val">{s.display != null ? s.display : s.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
