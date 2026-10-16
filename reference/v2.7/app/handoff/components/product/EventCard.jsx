import React from 'react';
import { Icon } from '../icons/Icon.jsx';
import { Badge } from '../feedback/Badge.jsx';

const css = `
.os-event{display:flex;flex-direction:column;font-family:var(--font-sans);background:var(--bg-surface);
  border:1px solid var(--border-default);border-radius:var(--radius-md);}
.os-event__row{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;}
.os-event__dot{width:8px;height:8px;border-radius:var(--radius-round);flex-shrink:0;}
.os-event__type{font-size:var(--text-label-m-size);font-weight:500;color:var(--text-primary);white-space:nowrap;}
.os-event__sentence{flex:1;font-size:var(--text-body-s-size);color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;}
.os-event__sentence .os-mono{font-family:var(--font-mono);font-size:var(--text-code-s-size);color:var(--text-primary);}
.os-event__time{font-size:var(--text-caption-size);color:var(--text-tertiary);white-space:nowrap;font-variant-numeric:tabular-nums;}
.os-event__chev{color:var(--text-tertiary);display:flex;transition:transform var(--duration-base) var(--ease-standard);}
.os-event__chev--open{transform:rotate(180deg);}
.os-event__payload{margin:0 14px 12px;padding:12px;background:var(--navy-950);color:var(--sky-300);border-radius:var(--radius-md);
  font-family:var(--font-mono);font-size:var(--text-code-s-size);line-height:var(--text-code-s-line);overflow-x:auto;white-space:pre;}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-event-css')) {
  const s = document.createElement('style'); s.id = 'os-event-css'; s.textContent = css; document.head.appendChild(s);
}

const dotColor = { success: 'var(--green-500)', info: 'var(--sky-500)', warning: 'var(--orange-500)', error: 'var(--red-500)', neutral: 'var(--neutral-400)' };

/** Blockchain event card: human sentence over raw payload (progressive disclosure). */
export function EventCard({ type = 'Event', sentence, chain, timestamp, status = 'info', payload, defaultOpen = false, style, className }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className={`os-event${className ? ' ' + className : ''}`} style={style}>
      <div className="os-event__row" role="button" tabIndex={0} aria-expanded={payload ? open : undefined}
        onClick={() => payload && setOpen(!open)}
        onKeyDown={(e) => { if (e.key === 'Enter' && payload) setOpen(!open); }}>
        <span className="os-event__dot" style={{ background: dotColor[status] }}></span>
        <span className="os-event__type">{type}</span>
        <span className="os-event__sentence">{sentence}</span>
        {chain ? <Badge status="neutral" dot={false}>{chain}</Badge> : null}
        <span className="os-event__time">{timestamp}</span>
        {payload ? <span className={`os-event__chev${open ? ' os-event__chev--open' : ''}`}><Icon name="chevron-down" size={16} /></span> : null}
      </div>
      {open && payload ? <pre className="os-event__payload">{typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)}</pre> : null}
    </div>
  );
}
