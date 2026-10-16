import React from 'react';
import { Icon } from '../icons/Icon.jsx';

const css = `
.os-pipeline{display:flex;align-items:stretch;gap:0;font-family:var(--font-sans);}
.os-pipeline__stage{flex:1;display:flex;flex-direction:column;gap:2px;padding:10px 14px;background:var(--bg-surface);
  border:1px solid var(--border-default);cursor:pointer;position:relative;min-width:0;}
.os-pipeline__stage:first-child{border-radius:var(--radius-md) 0 0 var(--radius-md);}
.os-pipeline__stage:last-child{border-radius:0 var(--radius-md) var(--radius-md) 0;}
.os-pipeline__stage + .os-pipeline__stage{border-left:none;}
.os-pipeline__stage:hover{background:var(--surface-hover);}
.os-pipeline__stage--hot{background:var(--status-warning-bg);border-color:var(--orange-500);border-left:1px solid var(--orange-500);z-index:1;}
.os-pipeline__label{font-size:var(--text-label-s-size);font-weight:500;letter-spacing:0.2px;text-transform:uppercase;color:var(--text-secondary);display:flex;align-items:center;gap:5px;}
.os-pipeline__count{font-size:var(--text-numeric-m-size);line-height:var(--text-numeric-m-line);font-weight:600;font-variant-numeric:tabular-nums;color:var(--text-primary);}
.os-pipeline__stage--hot .os-pipeline__label{color:var(--status-warning-text);}
.os-pipeline__arrow{align-self:center;color:var(--neutral-300);display:flex;margin:0 -1px;z-index:2;background:transparent;}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-pipeline-css')) {
  const s = document.createElement('style'); s.id = 'os-pipeline-css'; s.textContent = css; document.head.appendChild(s);
}

/** Delivery pipeline: Queued → Throttled → Sent → Delivered → Failed with live counts; orange = bottleneck. */
export function NotificationPipeline({ stages = [], onStage, style, className }) {
  return (
    <div className={`os-pipeline${className ? ' ' + className : ''}`} style={style} role="group" aria-label="Delivery pipeline">
      {stages.map((s, i) => (
        <React.Fragment key={s.label}>
          <div
            className={`os-pipeline__stage${s.bottleneck ? ' os-pipeline__stage--hot' : ''}`}
            role="button" tabIndex={0}
            onClick={() => onStage && onStage(s.label)}
          >
            <span className="os-pipeline__label">
              {s.bottleneck ? <Icon name="alert-triangle" size={16} strokeWidth={2} style={{ width: 12, height: 12 }} color="var(--orange-600)" /> : null}
              {s.label}
            </span>
            <span className="os-pipeline__count">{s.count}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
