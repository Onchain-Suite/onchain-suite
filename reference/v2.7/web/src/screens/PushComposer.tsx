import type { ReactNode } from 'react';
import { Icon } from '../components/icons';
import type { IconName } from '../components/icons';
import { Select, Switch } from '../components/ui';
import './push.css';
import { ACCENT_SWATCHES } from '../data/brand';

/* In-app push composer.
 *
 * Web and mobile are different products, not one flow with a toggle. A mobile push is an OS
 * notification: title, body, deep link, and the OS owns the rendering. A web in-app message
 * is a surface the SDK renders *inside* the dApp — so it needs the same placement model the
 * Forms builder uses (where it appears, when it fires, how often), plus a real CTA URL and
 * dismiss behaviour. Preview reflects the chosen surface rather than always showing a phone. */

export type PushSurface = 'modal' | 'banner' | 'slidein' | 'inline' | 'mobile';

export interface PushContent {
  surface: PushSurface;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  dismissible: boolean;
  accent: string;
  trigger: 'connect' | 'load' | 'route' | 'delay';
  delay: number;
  route: string;
  frequency: string;
  /* Delivery. Web in-app messages can't be pushed to a closed tab — the SDK asks for
     pending messages when a wallet connects. 'queue' makes that explicit and durable:
     the campaign is enqueued per wallet and fires on their next session, which is why
     view rates are high. 'live' only reaches wallets already connected at send time. */
  delivery: 'queue' | 'live';
  /** Days a queued message stays eligible before it expires unseen. */
  ttlDays: number;
  /** Cap on how many queued messages may fire in one session. */
  maxPerSession: number;
}

export const defaultPush = (): PushContent => ({
  surface: 'modal',
  title: 'Season 2 packs are live',
  body: 'Collect Packs, earn Hammers and take your shot at cracking the vault.',
  ctaLabel: 'Open Acme',
  ctaUrl: 'https://acme.com/season-2',
  dismissible: true,
  accent: '#1727E0',
  trigger: 'connect',
  delay: 3,
  route: '/vault',
  frequency: 'Once per wallet',
  delivery: 'queue',
  ttlDays: 14,
  maxPerSession: 1,
});

const G = 'var(--border-strong)', A = 'var(--action-primary)', L = 'var(--border-default)';
const bar = (x: number, y: number, w: number, h: number, fill: string) => <rect key={`${x}-${y}-${w}`} x={x} y={y} width={w} height={h} rx="2" fill={fill} />;
const wire = (rows: ReactNode) => <svg viewBox="0 0 120 96" style={{ width: '100%', height: '100%' }}>{rows}</svg>;

export const SURFACES: { id: PushSurface; name: string; desc: string; icon: IconName; thumb: ReactNode }[] = [
  { id: 'modal', name: 'Modal', desc: 'Centred, blocks the page', icon: 'square-mouse-pointer',
    thumb: wire([bar(6, 10, 108, 76, 'var(--surface-subtle)'), bar(34, 30, 52, 36, 'var(--bg-surface)'), bar(40, 38, 40, 5, G), bar(40, 52, 26, 8, A)]) },
  { id: 'banner', name: 'Banner', desc: 'Sticky bar at the top', icon: 'minus',
    thumb: wire([bar(10, 10, 100, 14, 'var(--bg-selected)'), bar(16, 15, 44, 5, A), bar(86, 14, 18, 7, A), bar(20, 36, 80, 5, L), bar(20, 46, 80, 5, L)]) },
  { id: 'slidein', name: 'Slide-in', desc: 'Corner card, non-blocking', icon: 'chevron-up',
    thumb: wire([bar(20, 14, 80, 5, L), bar(20, 24, 80, 5, L), bar(62, 52, 48, 32, 'var(--bg-surface)'), bar(68, 58, 34, 5, G), bar(68, 70, 24, 8, A)]) },
  { id: 'inline', name: 'Inline', desc: 'Embedded in the page', icon: 'layers',
    thumb: wire([bar(20, 12, 80, 5, L), bar(20, 30, 80, 22, 'var(--bg-selected)'), bar(26, 36, 44, 5, A), bar(20, 62, 80, 5, L), bar(20, 72, 80, 5, L)]) },
  { id: 'mobile', name: 'Mobile push', desc: 'OS notification', icon: 'smartphone',
    thumb: wire([bar(34, 8, 52, 80, 'var(--surface-subtle)'), bar(40, 20, 40, 16, 'var(--bg-surface)'), bar(44, 25, 22, 4, G)]) },
];

const TRIGGERS = [
  { value: 'connect', label: 'When a wallet connects' },
  { value: 'load', label: 'On page load' },
  { value: 'route', label: 'On a specific route' },
  { value: 'delay', label: 'After a delay' },
];

/** The message itself, styled per surface. Shared by the canvas preview and the review step. */
export function PushCard({ c, compact }: { c: PushContent; compact?: boolean }) {
  const banner = c.surface === 'banner';
  return (
    <div className={`pc${banner ? ' pc--banner' : ''}${compact ? ' pc--compact' : ''}`}>
      <span className="pc__badge" style={{ background: c.accent }}>A</span>
      <div className="pc__txt">
        <b>{c.title || 'Message title'}</b>
        <span>{c.body || 'Message body'}</span>
      </div>
      <span className="pc__cta" style={{ background: c.accent }}>{c.ctaLabel || 'Continue'}</span>
      {c.dismissible && <span className="pc__x" aria-hidden><Icon name="x" size={14} /></span>}
    </div>
  );
}

/** A dApp page mock so the operator sees where the message actually lands. */
export function PushPreview({ c }: { c: PushContent }) {
  if (c.surface === 'mobile') {
    return (
      <div className="pmock pmock--phone">
        <div className="pnote">
          <span className="pnote__app" style={{ background: c.accent }}>A</span>
          <span className="pnote__txt"><b>{c.title || 'Notification title'}</b><span>{c.body || 'Notification message'}</span></span>
          <span className="pnote__time">now</span>
        </div>
      </div>
    );
  }
  return (
    <div className="pmock">
      <div className="pmock__chrome">
        <i /><i /><i />
        <span className="pmock__url">app.acme.com{c.trigger === 'route' ? c.route : ''}</span>
        <span className="pmock__wallet"><Icon name="wallet" size={11} />0x1A2b…9F3e</span>
      </div>
      <div className="pmock__page">
        {[0.7, 0.45, 0.6].map((w, i) => <div key={i} className="pmock__line" style={{ width: `${w * 100}%` }} />)}
        {c.surface === 'inline' && <div className="pmock__slot"><PushCard c={c} /></div>}
        {[0.55, 0.7].map((w, i) => <div key={`b${i}`} className="pmock__line" style={{ width: `${w * 100}%` }} />)}
      </div>
      {c.surface === 'modal' && <><div className="pmock__scrim" /><div className="ppos ppos--modal"><PushCard c={c} /></div></>}
      {c.surface === 'banner' && <div className="ppos ppos--banner"><PushCard c={c} /></div>}
      {c.surface === 'slidein' && <div className="ppos ppos--slidein"><PushCard c={c} compact /></div>}
    </div>
  );
}

/** Left-hand editor. `value`/`onChange` so the wizard and automations both own the state. */
export function PushComposer({ value, onChange }: { value: PushContent; onChange: (c: PushContent) => void }) {
  const set = <K extends keyof PushContent>(k: K, v: PushContent[K]) => onChange({ ...value, [k]: v });
  const web = value.surface !== 'mobile';

  return (
    <div className="pcomp">
      <div className="field">
        <span className="field__lbl">Where it appears</span>
        <div className="psurfaces">
          {SURFACES.map((s) => (
            <button key={s.id} type="button" className={`psurface${value.surface === s.id ? ' on' : ''}`}
              onClick={() => set('surface', s.id)} aria-pressed={value.surface === s.id}>
              <span className="psurface__thumb">{s.thumb}</span>
              <span className="psurface__name">{s.name}</span>
              <span className="psurface__desc">{s.desc}</span>
            </button>
          ))}
        </div>
        <p className="field__hint">
          {web
            ? 'Rendered by the SDK inside your dApp. No OS permission needed, so it reaches every connected wallet.'
            : 'Delivered as an OS notification. Requires the mobile SDK and notification permission.'}
        </p>
      </div>

      <div className="field">
        <span className="field__lbl">Title</span>
        <div className="txt">
          <input value={value.title} onChange={(e) => set('title', e.target.value)} style={{ paddingRight: 44 }} aria-label="Title" />
          <span className="txt__count">{value.title.length}</span>
        </div>
        <p className="field__hint">{web ? 'One line reads best in a banner or slide-in.' : 'Under 48 characters. Longer titles clip on the lock screen.'}</p>
      </div>

      <div className="field">
        <span className="field__lbl">Message</span>
        <div className="txta"><textarea value={value.body} onChange={(e) => set('body', e.target.value)} aria-label="Message" /></div>
      </div>

      {web ? (
        <>
          <div className="pgrid">
            <div className="field">
              <span className="field__lbl">Button label</span>
              <div className="txt"><input value={value.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} aria-label="Button label" /></div>
            </div>
            <div className="field">
              <span className="field__lbl">Button link</span>
              <div className="txt"><input value={value.ctaUrl} onChange={(e) => set('ctaUrl', e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }} aria-label="Button link" /></div>
            </div>
          </div>

          <div className="field">
            <span className="field__lbl">When it fires</span>
            <Select options={TRIGGERS} value={value.trigger} aria-label="Trigger"
              onChange={(e) => set('trigger', e.target.value as PushContent['trigger'])} />
            {value.trigger === 'delay' && (
              <div className="txt" style={{ marginTop: 8 }}><input type="number" value={value.delay} onChange={(e) => set('delay', Number(e.target.value))} aria-label="Delay seconds" /></div>
            )}
            {value.trigger === 'route' && (
              <div className="txt" style={{ marginTop: 8 }}><input value={value.route} onChange={(e) => set('route', e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }} aria-label="Route" /></div>
            )}
          </div>

          <div className="pgrid">
            <div className="field">
              <span className="field__lbl">Show</span>
              <Select options={['Once per wallet', 'Once per session', 'Every visit', 'Until dismissed'].map((v) => ({ value: v, label: v }))}
                value={value.frequency} onChange={(e) => set('frequency', e.target.value)} aria-label="Frequency" />
            </div>
            <div className="field">
              <span className="field__lbl">Accent</span>
              <div className="pswatches">
                {ACCENT_SWATCHES.map((col) => (
                  <button key={col} type="button" aria-label={`Accent ${col}`} className={`pswatch${value.accent === col ? ' on' : ''}`}
                    style={{ background: col }} onClick={() => set('accent', col)} />
                ))}
              </div>
            </div>
          </div>

          <div className="prow">
            <span>Dismissible</span>
            <Switch checked={value.dismissible} label="Dismissible" onChange={(v) => set('dismissible', v)} />
          </div>

          <div className="field">
            <span className="field__lbl">Delivery</span>
            <div className="pdelivery">
              {([
                ['queue', 'Wait for connect', 'Queue per wallet and fire on their next session. Reaches wallets who aren’t online now.'],
                ['live', 'Only right now', 'Deliver only to wallets connected at send time. Everyone else is skipped.'],
              ] as const).map(([id, name, desc]) => (
                <button key={id} type="button" className={`pdel${value.delivery === id ? ' on' : ''}`}
                  onClick={() => set('delivery', id)} aria-pressed={value.delivery === id}>
                  <span className="pdel__dot" aria-hidden />
                  <span className="pdel__txt"><b>{name}</b><span>{desc}</span></span>
                </button>
              ))}
            </div>
            {value.delivery === 'queue' && (
              <div className="pgrid" style={{ marginTop: 12 }}>
                <div className="field">
                  <span className="field__lbl">Expires after</span>
                  <Select options={[3, 7, 14, 30, 90].map((d) => ({ value: String(d), label: `${d} days` }))}
                    value={String(value.ttlDays)} aria-label="Expires after"
                    onChange={(e) => set('ttlDays', Number(e.target.value))} />
                  <p className="field__hint">Stale messages shouldn’t greet a wallet months later.</p>
                </div>
                <div className="field">
                  <span className="field__lbl">Max per session</span>
                  <Select options={[1, 2, 3].map((n) => ({ value: String(n), label: `${n} message${n > 1 ? 's' : ''}` }))}
                    value={String(value.maxPerSession)} aria-label="Max per session"
                    onChange={(e) => set('maxPerSession', Number(e.target.value))} />
                  <p className="field__hint">Stops several campaigns stacking on one visit.</p>
                </div>
              </div>
            )}
            <p className="field__hint" style={{ marginTop: 8 }}>
              {value.delivery === 'queue'
                ? 'This is why in-app beats email on view rate: the message is waiting when they arrive, not competing in an inbox.'
                : 'Lowest reach. Most wallets won’t be connected the moment you press send.'}
            </p>
          </div>
        </>
      ) : (
        <div className="field">
          <span className="field__lbl">Deep link</span>
          <div className="txt"><input value={value.ctaUrl} onChange={(e) => set('ctaUrl', e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }} aria-label="Deep link" /></div>
          <p className="field__hint">Where the app opens when the notification is tapped.</p>
        </div>
      )}
    </div>
  );
}
