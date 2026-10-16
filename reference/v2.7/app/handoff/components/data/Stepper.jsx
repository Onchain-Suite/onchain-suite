import React from 'react';
import { Icon } from '../icons/Icon.jsx';

const css = `
.os-stepper{display:flex;align-items:center;gap:8px;font-family:var(--font-sans);}
.os-stepper__step{display:flex;align-items:center;gap:8px;}
.os-stepper__num{width:24px;height:24px;border-radius:var(--radius-round);display:flex;align-items:center;justify-content:center;
  font-size:12px;font-weight:600;border:1px solid var(--border-strong);color:var(--text-secondary);background:var(--bg-surface);box-sizing:border-box;flex-shrink:0;}
.os-stepper__label{font-size:var(--text-label-m-size);font-weight:500;color:var(--text-secondary);white-space:nowrap;}
.os-stepper__step--active .os-stepper__num{background:var(--action-primary);border-color:var(--action-primary);color:#fff;}
.os-stepper__step--active .os-stepper__label{color:var(--text-primary);}
.os-stepper__step--done .os-stepper__num{background:var(--blue-50);border-color:var(--blue-200);color:var(--action-primary);}
.os-stepper__step--done{cursor:pointer;}
.os-stepper__bar{flex:1;height:1px;background:var(--neutral-200);min-width:24px;}
.os-stepper__bar--done{background:var(--blue-300);}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-stepper-css')) {
  const s = document.createElement('style'); s.id = 'os-stepper-css'; s.textContent = css; document.head.appendChild(s);
}

/** Linear stepper for 3–6 step flows; completed steps clickable. */
export function Stepper({ steps = [], current = 0, onStepClick, style, className }) {
  return (
    <div className={`os-stepper${className ? ' ' + className : ''}`} style={style}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={i}>
            {i > 0 ? <span className={`os-stepper__bar${done || active ? ' os-stepper__bar--done' : ''}`}></span> : null}
            <span
              className={`os-stepper__step${active ? ' os-stepper__step--active' : ''}${done ? ' os-stepper__step--done' : ''}`}
              onClick={done && onStepClick ? () => onStepClick(i) : undefined}
              aria-current={active ? 'step' : undefined}
            >
              <span className="os-stepper__num">
                {done ? <Icon name="check" size={16} strokeWidth={2} style={{ width: 13, height: 13 }} /> : i + 1}
              </span>
              <span className="os-stepper__label">{label}</span>
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}
