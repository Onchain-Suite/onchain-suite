import React from 'react';
import { Icon } from '../icons/Icon.jsx';

const dotColor = { success: 'var(--green-500)', info: 'var(--sky-500)', warning: 'var(--orange-500)', error: 'var(--red-500)', neutral: 'var(--neutral-400)' };

const css = `
.os-timeline{display:flex;flex-direction:column;font-family:var(--font-sans);}
.os-timeline__entry{display:flex;gap:12px;position:relative;padding-bottom:20px;}
.os-timeline__entry:last-child{padding-bottom:0;}
.os-timeline__rail{display:flex;flex-direction:column;align-items:center;width:20px;flex-shrink:0;}
.os-timeline__dot{width:10px;height:10px;border-radius:var(--radius-round);border:2px solid;background:var(--bg-surface);margin-top:4px;flex-shrink:0;box-sizing:border-box;}
.os-timeline__line{width:1px;flex:1;background:var(--neutral-300);margin-top:4px;}
.os-timeline__body{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;}
.os-timeline__title{font-size:var(--text-body-s-size);line-height:var(--text-body-s-line);color:var(--text-primary);display:flex;align-items:center;gap:6px;}
.os-timeline__meta{font-size:var(--text-caption-size);line-height:var(--text-caption-line);color:var(--text-tertiary);}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-timeline-css')) {
  const s = document.createElement('style'); s.id = 'os-timeline-css'; s.textContent = css; document.head.appendChild(s);
}

/** Vertical timeline: status-coloured dots on a 1px connector line (the network motif).
    entries: { title, meta?, status?, icon? } */
export function Timeline({ entries = [], style, className }) {
  return (
    <div className={`os-timeline${className ? ' ' + className : ''}`} style={style}>
      {entries.map((e, i) => (
        <div className="os-timeline__entry" key={i}>
          <div className="os-timeline__rail">
            <span className="os-timeline__dot" style={{ borderColor: dotColor[e.status || 'neutral'] }}></span>
            {i < entries.length - 1 ? <span className="os-timeline__line"></span> : null}
          </div>
          <div className="os-timeline__body">
            <span className="os-timeline__title">
              {e.icon ? <Icon name={e.icon} size={16} color="var(--text-secondary)" /> : null}
              {e.title}
            </span>
            {e.meta ? <span className="os-timeline__meta">{e.meta}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
