import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './icons';
import { Sparkline } from './Sparkline';

export { Sparkline };
import './ui.css';

/** What an empty number or stat cell shows. One constant, so the whole product changes together. */
export const NO_VALUE = '–';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/* ---------------- Button ---------------- */
type BtnVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
export function Button({
  variant = 'primary', size = 'm', icon, trailingIcon, children, className, ...rest
}: {
  variant?: BtnVariant; size?: 's' | 'm' | 'l'; icon?: IconName; trailingIcon?: IconName; children?: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const isz = size === 's' ? 16 : 18;
  return (
    <button type="button" className={cx('btn', `btn--${variant}`, `btn--${size}`, className)} {...rest}>
      {icon && <Icon name={icon} size={isz} />}
      {children}
      {trailingIcon && <Icon name={trailingIcon} size={isz} />}
    </button>
  );
}

export function IconButton({
  icon, label, bordered, size = 20, className, ...rest
}: { icon: IconName; label: string; bordered?: boolean; size?: number } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" aria-label={label} title={label} className={cx('icon-btn', bordered && 'icon-btn--bordered', className)} {...rest}>
      <Icon name={icon} size={size} />
    </button>
  );
}

/* ---------------- Card ---------------- */
export function Card({ pad = true, className, children, ...rest }: { pad?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('card', pad && 'card--pad', className)} {...rest}>{children}</div>;
}

/* ---------------- Badge ---------------- */
type Status = 'success' | 'info' | 'warning' | 'error' | 'neutral';
export function Badge({ status = 'neutral', dot = true, live, children }: { status?: Status; dot?: boolean; live?: boolean; children: ReactNode }) {
  return (
    <span className={cx('badge', `badge--${status}`, live && 'badge--live')}>
      {dot && <span className="badge__dot" aria-hidden />}
      {children}
    </span>
  );
}

/* ---------------- Stat ---------------- */
export function Stat({ label, value, sub, icon, accent, deltaPct, spark }: {
  label: string; value: string; sub?: string; icon?: IconName; accent?: boolean; deltaPct?: number; spark?: number[];
}) {
  return (
    <div className="stat">
      <div className="stat__top">
        {icon ? <Icon name={icon} size={16} color="var(--text-tertiary)" /> : <span className="stat__label">{label}</span>}
        {icon && <Icon name="bar-chart-3" size={14} color="var(--text-disabled)" />}
      </div>
      <div className={cx('stat__value', accent && 'stat__value--accent')}>{value}</div>
      <div className="stat__sub">
        {icon ? label : sub}
        {deltaPct != null && (
          <span className={deltaPct >= 0 ? 'stat__delta--up' : 'stat__delta--down'}>
            {deltaPct >= 0 ? '▲' : '▼'} {Math.abs(deltaPct)}%
          </span>
        )}
      </div>
      {spark && spark.length > 1 && <Sparkline points={spark} label={label} />}
    </div>
  );
}


/* ---------------- Table (generic, typed) ---------------- */
export interface Column<T> {
  key: string;
  /** Visible header text. Empty is allowed for chevron/action columns — see srLabel. */
  label: string;
  /** Name announced when `label` is empty. Defaults to "Actions". */
  srLabel?: string;
  numeric?: boolean;
  /** Explains what the column counts, on an info icon in the header. A column of circles
   *  needs one — "Apps" alone does not say whether it means ever, or in the period. */
  hint?: string;
  render?: (row: T) => ReactNode;
}
export function Table<T extends { id: string }>({
  columns, rows, onRowClick, className,
}: { columns: Column<T>[]; rows: T[]; onRowClick?: (row: T) => void; className?: string }) {
  return (
    <table className={cx('table', className)}>
      <thead>
        {/* A column can be visually headerless (chevrons, row actions) but a blank <th> is
            an unnamed header to a screen reader. Fall back to the column key, hidden. */}
        <tr>{columns.map((c) => (
          <th key={c.key} className={c.numeric ? 'num' : undefined} scope="col">
            {c.label
              ? <>{c.label}{c.hint && <Tooltip content={c.hint}><Icon name="info" size={12} color="var(--text-tertiary)" /></Tooltip>}</>
              : <span className="sr-only">{c.srLabel ?? 'Actions'}</span>}
          </th>
        ))}</tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.id}
            className={onRowClick ? 'clickable' : undefined}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row); } : undefined}
          >
            {columns.map((c) => (
              <td key={c.key} className={c.numeric ? 'num' : undefined}>
                {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? NO_VALUE)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---------------- Switch ---------------- */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <label className={cx('switch', disabled && 'switch--disabled')}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span className="switch__track" aria-hidden />
      <span className="switch__thumb" aria-hidden />
    </label>
  );
}

/* ---------------- Checkbox ---------------- */
export function Checkbox({ checked, onChange, label, labelHidden, indeterminate }: { checked: boolean; onChange: (v: boolean) => void; label?: string; labelHidden?: boolean; indeterminate?: boolean }) {
  return (
    <label className={cx('checkbox', label && !labelHidden && 'checkbox--labelled')}>
      <input type="checkbox" checked={checked} ref={(el) => { if (el) el.indeterminate = !!indeterminate; }} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span className="checkbox__box" aria-hidden><Icon name="check" size={12} strokeWidth={3} /></span>
      {/* labelHidden names the control for assistive tech without printing the text again
          next to it — for rows that already show the name in their own markup. */}
      {label && !labelHidden && <span className="checkbox__label">{label}</span>}
    </label>
  );
}

/* ---------------- Tooltip ---------------- */
/* The bubble is rendered into <body>, not next to the thing it describes.
 *
 * It used to be an absolutely positioned child, which works until an ancestor clips it — and
 * the tables that need tooltips most are inside cards with overflow:hidden to keep their
 * corners rounded. The hint on the Audience table's Value column was being cut in half by the
 * card's own edge. z-index cannot fix that: clipping is not a stacking question.
 *
 * A portal escapes every ancestor, so this cannot come back on the next screen that wraps a
 * table in something. Position is measured at the moment it opens rather than tracked, since
 * a tooltip that is open while the page scrolls under it is already wrong. */
export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [at, setAt] = useState<{ top: number; left: number; below: boolean } | null>(null);

  const open = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    // Near the top of the viewport there is no room above, so it flips under the trigger
    // rather than being drawn off-screen.
    const below = r.top < 90;
    setAt({ top: below ? r.bottom + 8 : r.top - 8, left: r.left + r.width / 2, below });
  };

  /* A real button, not a span wearing role="button".
   *
   * It was the latter, which promises activation an element styled `cursor: help` never
   * delivered — eight call sites announcing "button" for something Enter and Space did
   * nothing to. Making it a button and having it toggle is the honest version, and it also
   * gives the hint a way to be dismissed from the keyboard, which a hover-only tooltip
   * covering the content underneath does not have. */
  return (
    <button ref={ref} type="button" className="tip" aria-label={content} aria-expanded={at !== null}
      onClick={() => (at ? setAt(null) : open())}
      onKeyDown={(e) => { if (e.key === 'Escape') setAt(null); }}
      onMouseEnter={open} onMouseLeave={() => setAt(null)}
      onFocus={open} onBlur={() => setAt(null)}>
      {children}
      {at && createPortal(
        <span className={`tip__bub${at.below ? ' tip__bub--below' : ''}`} role="tooltip"
          style={{ top: at.top, left: at.left }}>{content}</span>,
        document.body,
      )}
    </button>
  );
}

/* ---------------- RadioGroup ---------------- */
export function RadioGroup({ name, value, onChange, options }: {
  name: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div className="radios" role="radiogroup">
      {options.map((o) => (
        <label className="radio" key={o.value}>
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
          <span className="radio__dot" aria-hidden />
          <span className="radio__label">{o.label}</span>
        </label>
      ))}
    </div>
  );
}

/* ---------------- Input / Select ---------------- */
export function Input({ label, mono, helper, id, ...rest }: {
  label?: string; mono?: boolean; helper?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const fid = id ?? label?.replace(/\s+/g, '-').toLowerCase();
  return (
    <div className="field">
      {label && <label className="field__label" htmlFor={fid}>{label}</label>}
      <input id={fid} className={cx('input', mono && 'input--mono')} {...rest} />
      {helper && <span className="field__helper">{helper}</span>}
    </div>
  );
}
export function Select({ label, options, helper, id, ...rest }: {
  label?: string; options: { value: string; label: string }[]; helper?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const fid = id ?? label?.replace(/\s+/g, '-').toLowerCase();
  return (
    <div className="field">
      {label && <label className="field__label" htmlFor={fid}>{label}</label>}
      <select id={fid} className="select" {...rest}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {helper && <span className="field__helper">{helper}</span>}
    </div>
  );
}

/* ---------------- Chip / PillTabs / Segmented ---------------- */
export function Chip({ on, icon, children, ...rest }: { on?: boolean; icon?: IconName; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cx('chip', on && 'chip--on')} aria-pressed={on} {...rest}>
      {icon && <Icon name={icon} size={14} />}{children}
    </button>
  );
}

export interface TabDef { id: string; label: string; icon?: IconName; count?: number }
export function PillTabs({ tabs, active, onChange }: { tabs: TabDef[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="pill-tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={active === t.id}
          className={cx('pill-tabs__btn', active === t.id && 'pill-tabs__btn--on')} onClick={() => onChange(t.id)}>
          {t.icon && <Icon name={t.icon} size={15} />}{t.label}
          {t.count != null && <span className="pill-tabs__count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
export function Segmented({ options, value, onChange }: { options: TabDef[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={value === o.id}
          className={cx('segmented__btn', value === o.id && 'segmented__btn--on')} onClick={() => onChange(o.id)}>
          {o.icon && <Icon name={o.icon} size={15} />}{o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Accessible overlay (Modal / Drawer share focus logic) ---------------- */
/* Focus management runs once, on open.
 *
 * It used to depend on `onClose`, which every caller passes as an inline arrow — a new
 * function identity on every render. So the effect tore down and re-ran on each render:
 * cleanup returned focus to whatever opened the dialog, then setup focused the dialog's first
 * control again. Nothing showed it until a modal held its form state in the parent, at which
 * point a keystroke re-rendered the parent and focus was yanked out of the field mid-word —
 * every input in that dialog accepted exactly one character.
 *
 * The handler goes in a ref so the trap sets up once and still calls the current callback. */
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/* Trap, Escape, and focus restored on close — exported, because three of the biggest
 * authoring surfaces in the product were `aria-modal` dialogs with none of it. */
export function useOverlay(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const node = ref.current;

    /* Re-queried on every Tab rather than captured once.
     *
     * A static NodeList goes stale the moment the dialog's contents change, and these change
     * constantly: a disabled "Create" button becomes enabled when you type a name, and the
     * wallet sync modal swaps its entire body and footer between form, running and done. When
     * the captured `last` is disabled or detached, `activeElement === last` never matches and
     * Tab walks straight out of the dialog into the page behind the scrim.
     *
     * Disabled and hidden elements are filtered for the same reason: a trap whose boundary is
     * an element nobody can focus has no boundary. */
    const live = () => Array.from(node?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
      .filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);

    live()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeRef.current(); return; }
      if (e.key !== 'Tab') return;
      const items = live();
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      // Focus outside the dialog entirely — put it back rather than letting Tab continue.
      if (!node?.contains(document.activeElement)) { e.preventDefault(); first.focus(); return; }
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
    // Deliberately empty: the trap belongs to the lifetime of the overlay, not to a render.
  }, []);
  return ref;
}

// Backdrop dismiss: click on the scrim itself closes. Keyboard users dismiss via Escape
// (handled in useOverlay) or the always-present Close button, so the backdrop needs no key handler.
function backdropClose(onClose: () => void) {
  return (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); };
}

export function Modal({ title, onClose, children, footer, wide }: {
  title: string; onClose: () => void; children: ReactNode; footer?: ReactNode;
  /* 440px is the width of a question — "delete this?", "name that". A modal you work inside
     needs the room to work: the chart builder's sentence broke over four lines and its live
     preview was smaller than a thumbnail, which makes a preview pointless. */
  wide?: boolean;
}) {
  const ref = useOverlay(onClose);
  return (
     
    <div className="overlay overlay--center" role="presentation" onClick={backdropClose(onClose)}>
      <div ref={ref} className={`modal${wide ? ' modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__head"><h2 className="modal__title">{title}</h2><IconButton icon="x" label="Close" onClick={onClose} /></div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ title, onClose, children, footer }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const ref = useOverlay(onClose);
  return (
     
    <div className="overlay overlay--right" role="presentation" onClick={backdropClose(onClose)}>
      <div ref={ref} className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div className="drawer__head"><div className="drawer__title" id="drawer-title">{title}</div><IconButton icon="x" label="Close" onClick={onClose} /></div>
        <div className="drawer__body">{children}</div>
        {footer && <div className="drawer__foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------- EmptyState ---------------- */
export function EmptyState({ icon, title, desc, action }: { icon: IconName; title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty__icon"><Icon name={icon} size={22} /></div>
      <div className="empty__title">{title}</div>
      <div className="empty__desc">{desc}</div>
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}

/* ---------------- AddressChip ---------------- */
export function truncate(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}
/* Deterministic wallet identicon — a 5×5 mirrored blockie derived from the address.
   Wallets use this; people use Avatar. Always circular. */
export function Identicon({ address, size = 22 }: { address: string; size?: number }) {
  let h = 0;
  for (let i = 2; i < address.length; i++) h = (h * 31 + address.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const cells: boolean[] = [];
  for (let i = 0; i < 15; i++) cells.push((((h >> i) ^ (h >> (i + 7))) & 1) === 1);
  const at = (x: number, y: number) => cells[(x > 2 ? 4 - x : x) * 5 + y];
  return (
    <svg width={size} height={size} viewBox="0 0 5 5" aria-hidden style={{ borderRadius: '50%', flexShrink: 0, background: `hsl(${hue} 60% 94%)` }}>
      {Array.from({ length: 5 }, (_, x) => Array.from({ length: 5 }, (_, y) => (
        at(x, y) ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={`hsl(${hue} 62% 48%)`} /> : null
      )))}
    </svg>
  );
}

export function AddressChip({ address }: { address: string }) {
  const copy = () => { void navigator.clipboard?.writeText(address); };
  return (
    <span className="addr" aria-label={address}>
      {truncate(address)}
      <button type="button" className="addr__copy" aria-label="Copy address" onClick={(e) => { e.stopPropagation(); copy(); }}>
        <Icon name="copy" size={13} />
      </button>
    </span>
  );
}

/* ---------------- Channel dots ---------------- */
const CHAN_ICON: Record<string, IconName> = {
  email: 'mail', push: 'smartphone', x: 'at-sign', discord: 'message-circle',
};
const CHAN_LABEL: Record<string, string> = {
  email: 'Email', push: 'In-app push', x: 'X', discord: 'Discord',
};
export function ChannelDots({ ids }: { ids: string[] }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {ids.map((id) => (
        <span key={id} className="chan" title={CHAN_LABEL[id]}><Icon name={CHAN_ICON[id]} size={13} title={CHAN_LABEL[id]} /></span>
      ))}
    </span>
  );
}

/* ---------------- Skeleton rows ---------------- */
export function SkeletonRows({ rows = 5, height = 44 }: { rows?: number; height?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="sk" style={{ height }} />)}
    </div>
  );
}

/** The checkbox's visual only. For rows where the row itself is the control — a real
 *  checkbox nested inside a role="button" would be a second, unlabelled control. */
export function CheckMark({ on }: { on: boolean }) {
  return (
    <span className="checkbox" aria-hidden>
      <span className={cx('checkbox__box', on && 'checkbox__box--on')}><Icon name="check" size={12} strokeWidth={3} /></span>
    </span>
  );
}

