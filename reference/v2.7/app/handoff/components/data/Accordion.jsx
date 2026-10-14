import React from 'react';
import { Icon } from '../icons/Icon.jsx';

const css = `
.os-accordion{display:flex;flex-direction:column;font-family:var(--font-sans);border:1px solid var(--border-default);border-radius:var(--radius-lg);background:var(--bg-surface);overflow:hidden;}
.os-accordion__item + .os-accordion__item{border-top:1px solid var(--border-subtle);}
.os-accordion__head{display:flex;align-items:center;gap:10px;width:100%;padding:14px 16px;border:none;background:none;
  font-family:inherit;font-size:var(--text-heading-s-size);font-weight:600;color:var(--text-primary);cursor:pointer;text-align:left;box-sizing:border-box;}
.os-accordion__head:hover{background:var(--neutral-25);}
.os-accordion__head:focus-visible{outline:2px solid var(--border-focus);outline-offset:-2px;}
.os-accordion__chev{transition:transform var(--duration-base) var(--ease-standard);display:flex;color:var(--text-tertiary);}
.os-accordion__chev--open{transform:rotate(90deg);}
.os-accordion__body{padding:0 16px 14px 42px;font-size:var(--text-body-s-size);line-height:var(--text-body-s-line);color:var(--text-secondary);}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-accordion-css')) {
  const s = document.createElement('style'); s.id = 'os-accordion-css'; s.textContent = css; document.head.appendChild(s);
}

/** Accordion — FAQs, settings groups. Chevron rotates 90°; multiple-open allowed.
    items: { title, content } */
export function Accordion({ items = [], defaultOpen = [0], style, className }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const toggle = (i) => setOpen(open.includes(i) ? open.filter((o) => o !== i) : open.concat(i));
  return (
    <div className={`os-accordion${className ? ' ' + className : ''}`} style={style}>
      {items.map((item, i) => {
        const on = open.includes(i);
        return (
          <div className="os-accordion__item" key={i}>
            <button className="os-accordion__head" aria-expanded={on} onClick={() => toggle(i)}>
              <span className={`os-accordion__chev${on ? ' os-accordion__chev--open' : ''}`}><Icon name="chevron-right" size={16} /></span>
              {item.title}
            </button>
            {on ? <div className="os-accordion__body">{item.content}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
