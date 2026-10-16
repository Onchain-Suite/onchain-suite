import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AddressChip, Badge, Button, Identicon, Modal, RadioGroup, Select, Switch, Table, useOverlay } from '../components/ui';
import { Icon } from '../components/icons';
import { toast } from '../components/toast';
import { copyText, downloadCsv } from '../data/persist';
import type { IconName } from '../components/icons';
import type { FormRow } from '../data/types';
import './forms.css';
import { ACCENT_SWATCHES } from '../data/brand';

const opts = (a: string[]) => a.map((s) => ({ value: s, label: s }));

/* ---------- wireframe thumbnails (SVG, token-coloured) ---------- */
const G = 'var(--border-strong)', A = 'var(--action-primary)', L = 'var(--border-default)';
const bar = (x: number, y: number, w: number, h: number, fill: string) => <rect key={`${x}-${y}-${w}`} x={x} y={y} width={w} height={h} rx="2" fill={fill} />;
const wire = (rows: ReactNode) => <svg viewBox="0 0 120 96" style={{ width: '100%', height: '100%' }}>{rows}</svg>;

type StyleId = 'inline' | 'popup' | 'hellobar' | 'slidein' | 'hosted';
const STYLES: { id: StyleId; name: string; desc: string; thumb: ReactNode }[] = [
  { id: 'inline', name: 'Inline', desc: 'Sits within your page', thumb: wire([bar(20, 14, 80, 5, L), bar(20, 24, 80, 5, L), bar(20, 38, 80, 12, 'var(--bg-selected)'), bar(24, 41, 40, 6, A), bar(20, 58, 80, 5, L), bar(20, 68, 80, 5, L)]) },
  { id: 'popup', name: 'Pop-up', desc: 'Centered modal overlay', thumb: wire([bar(6, 10, 108, 76, 'var(--surface-subtle)'), bar(34, 32, 52, 32, 'var(--bg-surface)'), bar(40, 40, 40, 5, G), bar(40, 50, 40, 8, A)]) },
  { id: 'hellobar', name: 'Hello bar', desc: 'Sticky top banner', thumb: wire([bar(10, 12, 100, 14, 'var(--bg-selected)'), bar(16, 17, 44, 5, A), bar(84, 16, 20, 7, A), bar(20, 36, 80, 5, L), bar(20, 46, 80, 5, L), bar(20, 56, 80, 5, L)]) },
  { id: 'slidein', name: 'Slide-in', desc: 'Corner slide-in card', thumb: wire([bar(20, 14, 80, 5, L), bar(20, 24, 80, 5, L), bar(20, 34, 80, 5, L), bar(62, 54, 46, 30, 'var(--bg-surface)'), bar(68, 60, 34, 5, G), bar(68, 70, 34, 8, A)]) },
  { id: 'hosted', name: 'Hosted page', desc: 'Standalone link we host', thumb: wire([bar(6, 10, 108, 12, 'var(--surface-subtle)'), bar(12, 14, 10, 4, G), bar(34, 40, 52, 10, 'var(--bg-surface)'), bar(40, 43, 24, 4, G), bar(40, 56, 40, 8, A)]) },
];
type FormType = 'identity' | 'lead';
type FieldType = 'connect' | 'email' | 'socialX' | 'text' | 'consent';
const TEMPLATES: { id: string; name: string; desc: string; type: FormType; fields?: FieldType[] }[] = [
  { id: 'basic', name: 'Basic', desc: 'Email + subscribe', type: 'lead' },
  { id: 'waitlist', name: 'Waitlist', desc: 'Connect wallet + email', type: 'identity' },
  { id: 'connect', name: 'Wallet connect', desc: 'Wallet-only gate', type: 'identity', fields: ['connect', 'consent'] },
  { id: 'airdrop', name: 'Airdrop eligibility', desc: 'Connect + verify + email', type: 'identity' },
  { id: 'newsletter', name: 'Newsletter', desc: 'Lead capture, styled', type: 'lead' },
];
const templateThumb = (t: { type: FormType }) => wire(
  t.type === 'identity'
    ? [bar(30, 16, 60, 5, G), bar(30, 26, 60, 4, L), bar(30, 38, 60, 10, A), bar(30, 54, 60, 7, 'var(--bg-selected)'), bar(30, 66, 60, 7, 'var(--bg-selected)'), bar(30, 80, 60, 8, A)]
    : [bar(20, 30, 58, 10, 'var(--bg-surface)'), bar(82, 30, 18, 10, A), bar(20, 48, 80, 4, L), bar(20, 56, 80, 4, L)]
);

const FIELD_META: Record<FieldType, { icon: IconName; name: string; fixed?: boolean; canRequire?: boolean }> = {
  connect: { icon: 'wallet', name: 'Connect wallet', fixed: true, canRequire: false },
  email: { icon: 'mail', name: 'Email', canRequire: true },
  socialX: { icon: 'twitter', name: 'Link X', canRequire: true },
  text: { icon: 'type', name: 'Short text', canRequire: true },
  consent: { icon: 'shield-check', name: 'Consent', canRequire: true, fixed: true },
};
const PROPERTIES = ['Do not store', 'Email', 'Display name', 'X handle', 'Referral code', 'Custom property…'];
const defaultMap: Record<string, string> = { email: 'Email', text: 'Display name', socialX: 'X handle' };

type Field = { id: string; type: FieldType; label: string; required: boolean; map?: string };
let fbId = 1;
const HOSTED_URL = 'forms.onchainsuite.xyz/acme/season-2';
const EMBED = '<script src="https://cdn.onchainsuite.xyz/forms.js"\n  data-form="acme-connect"></script>';
const identityFields = (): Field[] => [
  { id: 'f_c', type: 'connect', label: 'Connect wallet', required: true },
  { id: 'f_e', type: 'email', label: 'Email address', required: true },
  { id: 'f_x', type: 'socialX', label: 'Link X', required: false },
  { id: 'f_cons', type: 'consent', label: 'I agree to receive updates and consent to linking my wallet to my contact details. I can unsubscribe any time.', required: true },
];
const leadFields = (): Field[] => [
  { id: 'f_e', type: 'email', label: 'Email address', required: true },
  { id: 'f_cons', type: 'consent', label: 'I agree to receive updates. I can unsubscribe any time.', required: true },
];
const SUBS = [
  { id: 's1', addr: '0x1A2b3C4d5E6f7A8b9C0d1E2f3A4b5C6d7E8f9F3e', ens: 'maya.eth', email: 'v@ethereum.org', linked: 'Email · X', when: '14 min ago' },
  { id: 's2', addr: '0x8Cc47712bF3A0d2eE291B7A5C41f9E88Dd0121aB', ens: '', email: '', linked: 'X', when: '1h ago' },
  { id: 's3', addr: '0xF31d99C02aE84b7cD1204E5F6a7B8C9D0E1F77c0', ens: 'leo.eth', email: 'max@proton.me', linked: 'Email', when: '3h ago' },
  { id: 's4', addr: '0x9E0fD34567812345aBcD6789Ef0123456789Cafe', ens: 'degen.eth', email: 'gm@degen.xyz', linked: 'Email · X', when: '6h ago' },
];

export function FormBuilder({ form, isNew, onClose, onSave }: {
  form: FormRow; isNew: boolean; onClose: () => void; onSave: (f: FormRow) => void;
}) {
  /* aria-modal hides the rest of the document from assistive tech. Without focus management
     that leaves a keyboard user on <body> with everything hidden — stranded in the largest
     authoring surface in the product. */
  const fbRef = useOverlay(onClose);
  const [stage, setStage] = useState<'style' | 'template' | 'content'>(isNew ? 'style' : 'content');
  const [style, setStyle] = useState<StyleId>('inline');
  const [template, setTemplate] = useState<string | null>(null);
  const [tab, setTab] = useState<'build' | 'submissions' | 'share'>('build');
  const [ptab, setPtab] = useState<'fields' | 'display' | 'settings'>('fields');
  const [name, setName] = useState(form.name);
  const [type, setType] = useState<FormType>(form.captureType === 'Identity capture' ? 'identity' : 'lead');
  const [surface, setSurface] = useState<'widget' | 'hosted'>(form.surface === 'Widget' ? 'widget' : 'hosted');
  const [title, setTitle] = useState(type === 'identity' ? 'Join Season 2' : 'Get the Acme newsletter');
  const [subtitle, setSubtitle] = useState(type === 'identity' ? 'Connect your wallet and link an email to claim your spot and get pack-drop alerts.' : 'Drops, tips, and pack news, straight to your inbox.');
  const [fields, setFields] = useState<Field[]>(type === 'identity' ? identityFields() : leadFields());
  const [sel, setSel] = useState<string | null>(null);
  const [enrol, setEnrol] = useState(!!form.enrolsInto);
  const [submitted, setSubmitted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [display, setDisplay] = useState({ trigger: 'load', delay: 3, scroll: 50, freq: 'Once per visitor', pages: 'All pages' });
  const [styleCfg, setStyleCfg] = useState({ bg: 'surface', corners: 'md', btn: 'solid', hero: false, accent: '#FF6828' });
  const [doubleOptIn, setDoubleOptIn] = useState(false);
  const [postAction, setPostAction] = useState<'message' | 'redirect' | 'reveal'>('message');
  const [toList, setToList] = useState('Season 2 waitlist');
  const [enrolAuto, setEnrolAuto] = useState(form.enrolsInto ?? 'Welcome new wallets');
  const [subRange, setSubRange] = useState('Last 30 days');
  const [qr, setQr] = useState(false);

  const identity = type === 'identity';
  const accent = styleCfg.accent;
  const overlay = surface === 'widget' && (style === 'popup' || style === 'slidein' || style === 'hellobar');
  const radius = styleCfg.corners === 'sharp' ? '2px' : styleCfg.corners === 'pill' ? '18px' : 'var(--radius-md)';
  const euBg = styleCfg.bg === 'dark' ? '#16181d' : styleCfg.bg === 'tint' ? 'var(--bg-selected)' : 'var(--bg-surface)';
  const euText = styleCfg.bg === 'dark' ? '#fff' : 'var(--text-primary)';
  const reach = { email: fields.some((f) => f.type === 'email'), push: fields.some((f) => f.type === 'connect') };
  const selField = fields.find((f) => f.id === sel);

  const commit = (extra?: Partial<FormRow>) => onSave({
    ...form,
    name: name.trim() || 'Untitled form',
    captureType: identity ? 'Identity capture' : 'Lead capture',
    surface: surface === 'widget' ? 'Widget' : 'Hosted',
    enrolsInto: enrol ? enrolAuto : null,
    ...extra,
  });

  const switchType = (t: FormType) => {
    setType(t);
    setFields(t === 'identity' ? identityFields() : leadFields());
    setTitle(t === 'identity' ? 'Join Season 2' : 'Get the Acme newsletter');
    setSubtitle(t === 'identity' ? 'Connect your wallet and link an email to claim your spot and get pack-drop alerts.' : 'Drops, tips, and pack news, straight to your inbox.');
    setSel(null);
  };
  const addField = (t: FieldType) => {
    const node: Field = { id: 'f' + fbId++, type: t, label: FIELD_META[t].name, required: false };
    const consentIdx = fields.findIndex((f) => f.type === 'consent');
    setFields((v) => { const at = consentIdx === -1 ? v.length : consentIdx; return [...v.slice(0, at), node, ...v.slice(at)]; });
    setSel(node.id); setPtab('fields');
  };
  const editField = (id: string, patch: Partial<Field>) => setFields((v) => v.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const removeField = (id: string) => { setFields((v) => v.filter((f) => f.id !== id)); setSel(null); };
  const moveField = (id: string, dir: -1 | 1) => setFields((v) => {
    const i = v.findIndex((f) => f.id === id); const j = i + dir;
    if (j < 0 || j >= v.length) return v;
    const n = [...v]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const applyTemplate = (t: typeof TEMPLATES[number]) => {
    setTemplate(t.id);
    switchType(t.type);
    if (t.fields) setFields(t.fields.map((ft) => ({ id: 'f' + fbId++, type: ft, label: ft === 'consent' ? 'I agree to receive updates and consent to linking my wallet to my contact details. I can unsubscribe any time.' : FIELD_META[ft].name, required: ft !== 'socialX' })));
  };
  const pickStyle = (id: StyleId) => { setStyle(id); setSurface(id === 'hosted' ? 'hosted' : 'widget'); };

  const WSTEPS: [typeof stage, string, string][] = [['style', 'Style', 'How it appears'], ['template', 'Template', 'Starting layout'], ['content', 'Content', 'Fields & settings']];
  const stageIdx = ['style', 'template', 'content'].indexOf(stage);
  const tplName = template ? TEMPLATES.find((t) => t.id === template)!.name : null;

  const wizShell = (center: ReactNode) => (
    <div className="fw__grid">
      <nav className="fw__rail" aria-label="Form steps">
        {WSTEPS.map(([id, l, sub], i) => (
          <button key={id} type="button" disabled={i >= stageIdx} onClick={() => i < stageIdx && setStage(id)}
            className={`fwr${stage === id ? ' fwr--active' : ''}${i < stageIdx ? ' fwr--done' : ''}`}>
            <span className="fwr__n">{i < stageIdx ? <Icon name="check" size={12} strokeWidth={3} /> : i + 1}</span>
            <span className="fwr__t"><b>{l}</b><span>{sub}</span></span>
          </button>
        ))}
      </nav>
      {center}
      <aside className="fsum">
        <div className="fsum__h"><Icon name="clipboard-list" size={16} color="var(--action-primary)" />Form summary</div>
        <dl className="fsum__b">
          <div className="fsum__row"><dt>Name</dt><dd>{name.trim() || 'Untitled form'}</dd></div>
          <div className="fsum__row"><dt>Style</dt><dd>{STYLES.find((s) => s.id === style)!.name}</dd></div>
          <div className="fsum__row"><dt>Template</dt><dd className={tplName ? '' : 'muted'}>{tplName ?? 'Not selected'}</dd></div>
          <div className="fsum__row"><dt>Type</dt><dd>{identity ? 'Identity capture' : 'Lead capture'}</dd></div>
          <div className="fsum__row"><dt>Fields</dt><dd>{fields.length}</dd></div>
          <div className="fsum__row"><dt>Makes reachable</dt><dd><span className="fsum__reach">
            <span style={{ color: reach.email ? 'var(--action-primary)' : 'var(--text-tertiary)' }}><Icon name={reach.email ? 'check' : 'x'} size={12} />Email</span>
            <span style={{ color: reach.push ? 'var(--action-primary)' : 'var(--text-tertiary)' }}><Icon name={reach.push ? 'check' : 'x'} size={12} />Push</span>
          </span></dd></div>
          <div className="fsum__row"><dt>Adds to list</dt><dd>{toList}</dd></div>
          <div className="fsum__row"><dt>Enrols into</dt><dd className={enrol ? '' : 'muted'}>{enrol ? enrolAuto : 'None'}</dd></div>
        </dl>
      </aside>
    </div>
  );

  const renderField = (f: Field) => {
    if (f.type === 'connect') return connected ? (
      <div className="eu__connected">
        <Identicon address="0x1A2b3C4d5E6f7A8b9C0d1E2f3A4b5C6d7E8f9F3e" size={26} />
        <b style={{ fontSize: 13, fontWeight: 500 }}>maya.eth</b>
        <AddressChip address="0x1A2b3C4d5E6f7A8b9C0d1E2f3A4b5C6d7E8f9F3e" />
        <span style={{ marginLeft: 'auto' }}><Icon name="check" size={16} color="var(--action-primary)" /></span>
      </div>
    ) : (
      <div className="eu__wallet" style={{ background: accent, cursor: 'pointer' }} role="button" tabIndex={0}
        onClick={(e) => { e.stopPropagation(); setConnected(true); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setConnected(true); } }}><Icon name="wallet" size={18} />{f.label}</div>
    );
    if (f.type === 'email' || f.type === 'text') return (
      <div className="eu__field"><span className="eu__lbl">{f.label}{f.required && <span className="fb__req">*</span>}</span><div className="eu__input">{f.type === 'email' ? 'you@wallet.xyz' : 'Type here…'}</div></div>
    );
    if (f.type === 'socialX') return <div className="eu__social" style={{ height: 40 }}><Icon name="twitter" size={15} />{f.label}</div>;
    return (
      <div className="eu__consent">
        <span className="eu__box" style={{ background: accent, borderColor: accent }}><Icon name="check" size={11} strokeWidth={3} /></span>
        <span>{f.label}</span>
      </div>
    );
  };

  const preview = submitted ? (
    <div className="eu__thanks">
      <span className="ic"><Icon name="check" size={22} color="var(--action-primary)" strokeWidth={2.5} /></span>
      <h2>You&apos;re on the list</h2>
      <p className="sub">Thanks for joining. Keep an eye on your inbox for what&apos;s next.</p>
      <Button variant="secondary" size="s" onClick={() => { setSubmitted(false); setConnected(false); }}>Reset preview</Button>
    </div>
  ) : (
    <>
      {styleCfg.hero && <div className="eu__hero">Hero image</div>}
      <div className="eu__brand"><span className="eu__logo" style={{ background: accent }}>V</span><b style={{ color: euText }}>Acme</b></div>
      <h2 style={{ color: euText }}>{title}</h2>
      <p className="sub" style={styleCfg.bg === 'dark' ? { color: 'rgba(255,255,255,0.7)' } : undefined}>{subtitle}</p>
      {fields.map((f, i) => (
        <div key={f.id} className={`eu__blk${sel === f.id ? ' on' : ''}`} role="button" tabIndex={0}
          onClick={(e) => { e.stopPropagation(); setSel(f.id); setPtab('fields'); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setSel(f.id); setPtab('fields'); } }}>
          {renderField(f)}
          <div className="eu__blktools">
            <button type="button" disabled={i === 0} onClick={(e) => { e.stopPropagation(); moveField(f.id, -1); }} aria-label="Move up"><Icon name="chevron-up" size={14} /></button>
            <button type="button" disabled={i === fields.length - 1} onClick={(e) => { e.stopPropagation(); moveField(f.id, 1); }} aria-label="Move down"><Icon name="chevron-down" size={14} /></button>
            {!FIELD_META[f.type].fixed && <button type="button" onClick={(e) => { e.stopPropagation(); removeField(f.id); }} aria-label="Delete"><Icon name="trash-2" size={13} /></button>}
          </div>
        </div>
      ))}
      <div className="eu__submit" role="button" tabIndex={0}
        style={{ background: styleCfg.btn === 'outline' ? 'transparent' : accent, color: styleCfg.btn === 'outline' ? accent : '#fff', border: styleCfg.btn === 'outline' ? `1.5px solid ${accent}` : 'none', borderRadius: radius, cursor: 'pointer' }}
        onClick={() => setSubmitted(true)} onKeyDown={(e) => { if (e.key === 'Enter') setSubmitted(true); }}>{identity ? 'Verify & join' : 'Subscribe'}</div>
      {identity && <div className="eu__zk"><Icon name="shield-check" size={13} color="var(--action-primary)" />Verified with a zero-knowledge proof. Your identity is never exposed</div>}
      {doubleOptIn && !identity && <div className="eu__zk"><Icon name="mail-check" size={13} color="var(--action-primary)" />We&apos;ll email a confirmation link before subscribing you</div>}
    </>
  );

  return createPortal(
    <div ref={fbRef} className="fb" role="dialog" aria-modal="true" aria-label="Form builder">
      <div className="fb__top">
        <button type="button" className="fb__back" onClick={onClose}><Icon name="arrow-left" size={16} />Forms</button>
        <span style={{ width: 1, height: 20, background: 'var(--border-default)' }} />
        <input className="fb__name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Form name" placeholder="Untitled form" />
        <Badge status={form.status === 'Live' ? 'success' : 'neutral'}>{form.status}</Badge>
        {isNew && stage !== 'content' ? <span style={{ flex: 1 }} /> : (
          <div className="fb__seg">
            {([['build', 'Build'], ['submissions', 'Submissions'], ['share', 'Share']] as const).map(([id, l]) => (
              <button key={id} type="button" className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{l}</button>
            ))}
          </div>
        )}
        {stage === 'style' ? (
          <Button size="s" trailingIcon="arrow-right" onClick={() => setStage('template')}>Save &amp; next</Button>
        ) : stage === 'template' ? (
          <>
            <Button variant="secondary" size="s" onClick={() => setStage('style')}>Back</Button>
            <Button size="s" trailingIcon="arrow-right" disabled={!template} onClick={() => setStage('content')}>Save &amp; next</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" size="s" icon={form.status === 'Live' ? 'pause' : 'play'} onClick={() => commit({ status: form.status === 'Live' ? 'Draft' : 'Live' })}>{form.status === 'Live' ? 'Pause' : 'Publish'}</Button>
            <Button size="s" icon="check" onClick={() => commit()}>Save</Button>
          </>
        )}
      </div>

      <div className="fb__body">
        {stage === 'style' ? wizShell(
          <div className="fw__gbody">
            <h2>Select a style</h2>
            <div className="cards">
              {STYLES.map((s) => (
                <div key={s.id} className={`card2${style === s.id ? ' on' : ''}`} role="button" tabIndex={0}
                  onClick={() => pickStyle(s.id)} onKeyDown={(e) => { if (e.key === 'Enter') pickStyle(s.id); }}>
                  <div className="card2__thumb">{s.thumb}</div>
                  <div className="card2__cap"><b>{s.name}</b><span>{s.desc}</span></div>
                </div>
              ))}
            </div>
          </div>
        ) : stage === 'template' ? wizShell(
          <div className="fw__gbody">
            <h2>Select a template</h2>
            <div className="cards">
              {TEMPLATES.map((t) => (
                <div key={t.id} className={`card2${template === t.id ? ' on' : ''}`} role="button" tabIndex={0}
                  onClick={() => applyTemplate(t)} onKeyDown={(e) => { if (e.key === 'Enter') applyTemplate(t); }}>
                  <div className="card2__thumb">{templateThumb(t)}</div>
                  <div className="card2__cap"><b>{t.name}</b><span>{t.desc}</span></div>
                </div>
              ))}
            </div>
          </div>
        ) : tab === 'build' ? (
          <>
            <aside className="fb__panel">
              <div className="fb__ptabs">
                {([['fields', 'Fields'], ['display', 'Display'], ['settings', 'Settings']] as const).map(([id, l]) => (
                  <button key={id} type="button" className={ptab === id ? 'on' : ''} onClick={() => setPtab(id)}>{l}</button>
                ))}
              </div>

              {ptab === 'fields' ? (
                <>
                  <div className="fb__sec">
                    <h3>Add a field</h3>
                    <div className="fb__pal">
                      {(['email', 'text', 'socialX', 'connect'] as FieldType[]).map((t) => {
                        const exists = FIELD_META[t].fixed && fields.some((f) => f.type === t);
                        const gated = (t === 'connect' || t === 'socialX') && !identity;
                        return (
                          <button key={t} type="button" className="fb__palbtn" disabled={exists || gated} onClick={() => addField(t)}>
                            <i><Icon name={FIELD_META[t].icon} size={15} /></i>{FIELD_META[t].name}
                          </button>
                        );
                      })}
                    </div>
                    {!identity && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>Wallet &amp; social fields are available on Identity capture forms. Switch type under Settings.</p>}
                  </div>
                  {selField ? (
                    <div className="fb__sec">
                      <h3>{FIELD_META[selField.type].name} field</h3>
                      <div className="fb__insp">
                        <label className="fb__field"><span>{selField.type === 'consent' ? 'Consent copy' : 'Label'}</span>
                          {selField.type === 'consent'
                            ? <textarea className="fb__ta" rows={3} value={selField.label} onChange={(e) => editField(selField.id, { label: e.target.value })} />
                            : <input className="fb__ta" value={selField.label} onChange={(e) => editField(selField.id, { label: e.target.value })} />}
                        </label>
                        {FIELD_META[selField.type].canRequire && (
                          <div className="fb__row"><span>Required</span><Switch checked={selField.required} label="Required" onChange={(v) => editField(selField.id, { required: v })} /></div>
                        )}
                        {selField.type !== 'consent' && selField.type !== 'connect' && (
                          <div className="fb__field"><Select label="Map to contact property" options={opts(PROPERTIES)} defaultValue={selField.map ?? defaultMap[selField.type]} onChange={(e) => editField(selField.id, { map: e.target.value })} /></div>
                        )}
                        {selField.type === 'consent' && (
                          <p style={{ margin: 0, display: 'flex', gap: 6, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}><Icon name="shield-check" size={13} color="var(--action-primary)" style={{ flexShrink: 0, marginTop: 1 }} />The wallet↔identity link is minted as a ZK proof, stored off-chain, deletable on unsubscribe.</p>
                        )}
                        {!FIELD_META[selField.type].fixed && <Button variant="tertiary" size="s" icon="trash-2" onClick={() => removeField(selField.id)}>Remove field</Button>}
                      </div>
                    </div>
                  ) : (
                    <div className="fb__sec"><p style={{ margin: 0, fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>Select a field in the preview to edit its label, mark it required, or remove it. Reorder with the ↑↓ controls.</p></div>
                  )}
                </>
              ) : ptab === 'display' ? (
                <>
                  <div className="fb__sec">
                    <h3>Where it shows</h3>
                    <Select label="Pages" options={opts(['All pages', 'Homepage only', 'Specific paths…', 'Everywhere except checkout'])} defaultValue={display.pages} onChange={(e) => setDisplay((d) => ({ ...d, pages: e.target.value }))} />
                    {!overlay && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5, display: 'flex', gap: 6 }}><Icon name="info" size={12} style={{ flexShrink: 0, marginTop: 2 }} />{surface === 'hosted' ? 'Hosted pages open from their own link. Timing rules below don’t apply.' : 'Inline forms show in place. Timing rules apply to overlays (Pop-up, Slide-in, Hello bar).'}</p>}
                  </div>
                  {overlay && (
                    <>
                      <div className="fb__sec">
                        <h3>When it appears</h3>
                        <RadioGroup name="trg" value={display.trigger} onChange={(v) => setDisplay((d) => ({ ...d, trigger: v }))}
                          options={[{ value: 'load', label: 'On page load' }, { value: 'delay', label: 'After a delay' }, { value: 'scroll', label: 'On scroll depth' }, { value: 'exit', label: 'On exit intent' }]} />
                        {display.trigger === 'delay' && <label className="fb__field"><span>Delay (seconds)</span><input className="fb__ta" type="number" value={display.delay} onChange={(e) => setDisplay((d) => ({ ...d, delay: Number(e.target.value) }))} /></label>}
                        {display.trigger === 'scroll' && <label className="fb__field"><span>Scroll depth (%)</span><input className="fb__ta" type="number" value={display.scroll} onChange={(e) => setDisplay((d) => ({ ...d, scroll: Number(e.target.value) }))} /></label>}
                      </div>
                      <div className="fb__sec">
                        <h3>Frequency</h3>
                        <Select options={opts(['Once per visitor', 'Once per session', 'Every visit', 'Until submitted'])} defaultValue={display.freq} onChange={(e) => setDisplay((d) => ({ ...d, freq: e.target.value }))} />
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>Visitors who already submitted are never shown the form again.</p>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="fb__sec">
                    <h3>Form type</h3>
                    <Select options={opts(['Identity capture: wallet + verified link', 'Lead capture: email, wallet optional'])}
                      value={identity ? 'Identity capture: wallet + verified link' : 'Lead capture: email, wallet optional'}
                      onChange={(e) => switchType(e.target.value.startsWith('Identity') ? 'identity' : 'lead')} />
                    <div className="fb__field"><span>Surface</span>
                      <div className="seg2">
                        {([['widget', 'Embed widget'], ['hosted', 'Hosted page']] as const).map(([id, l]) => (
                          <button key={id} type="button" className={surface === id ? 'on' : ''} onClick={() => setSurface(id)}>{l}</button>
                        ))}
                      </div>
                    </div>
                    <div className="reach2">
                      <b>This form makes contacts</b>
                      <div className="reach2__row"><Icon name={reach.email ? 'check' : 'x'} size={14} color={reach.email ? 'var(--action-primary)' : 'var(--text-tertiary)'} />Email-reachable {reach.email ? '' : '(add an Email field)'}</div>
                      <div className="reach2__row"><Icon name={reach.push ? 'check' : 'x'} size={14} color={reach.push ? 'var(--action-primary)' : 'var(--text-tertiary)'} />Push-reachable {reach.push ? '' : '(add Connect wallet)'}</div>
                    </div>
                  </div>
                  <div className="fb__sec">
                    <h3>Header</h3>
                    <label className="fb__field"><span>Title</span><input className="fb__ta" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
                    <label className="fb__field"><span>Subtitle</span><textarea className="fb__ta" rows={2} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></label>
                  </div>
                  <div className="fb__sec">
                    <h3>Style</h3>
                    <div className="fb__field"><span>Accent</span>
                      <div className="swatches">{ACCENT_SWATCHES.map((c) => (
                        <button key={c} type="button" aria-label={`Accent ${c}`} className={`swatch${styleCfg.accent === c ? ' on' : ''}`} style={{ background: c }} onClick={() => setStyleCfg((s) => ({ ...s, accent: c }))} />
                      ))}</div>
                    </div>
                    <div className="fb__field"><span>Background</span>
                      <div className="seg2">{([['surface', 'Light'], ['tint', 'Tint'], ['dark', 'Dark']] as const).map(([id, l]) => <button key={id} type="button" className={styleCfg.bg === id ? 'on' : ''} onClick={() => setStyleCfg((s) => ({ ...s, bg: id }))}>{l}</button>)}</div>
                    </div>
                    <div className="fb__field"><span>Corners</span>
                      <div className="seg2">{([['sharp', 'Sharp'], ['md', 'Rounded'], ['pill', 'Pill']] as const).map(([id, l]) => <button key={id} type="button" className={styleCfg.corners === id ? 'on' : ''} onClick={() => setStyleCfg((s) => ({ ...s, corners: id }))}>{l}</button>)}</div>
                    </div>
                    <div className="fb__field"><span>Button</span>
                      <div className="seg2">{([['solid', 'Solid'], ['outline', 'Outline']] as const).map(([id, l]) => <button key={id} type="button" className={styleCfg.btn === id ? 'on' : ''} onClick={() => setStyleCfg((s) => ({ ...s, btn: id }))}>{l}</button>)}</div>
                    </div>
                    <div className="fb__row"><span>Hero image</span><Switch checked={styleCfg.hero} label="Hero image" onChange={(v) => setStyleCfg((s) => ({ ...s, hero: v }))} /></div>
                  </div>
                  <div className="fb__sec">
                    <h3>Consent &amp; verification</h3>
                    {identity ? (
                      <p style={{ margin: 0, display: 'flex', gap: 6, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}><Icon name="shield-check" size={13} color="var(--action-primary)" style={{ flexShrink: 0, marginTop: 1 }} />Identity forms verify the wallet↔email link with a ZK proof at submit. No extra confirmation email needed.</p>
                    ) : (
                      <div className="fb__row"><span>Double opt-in (email confirm)</span><Switch checked={doubleOptIn} label="Double opt-in" onChange={setDoubleOptIn} /></div>
                    )}
                  </div>
                  <div className="fb__sec">
                    <h3>Where contacts land</h3>
                    <div className="fb__field"><Select label="Add subscribers to list" options={opts(['Newsletter subscribers', 'Season 2 waitlist', 'Airdrop applicants', '+ Create new list…'])} value={toList} onChange={(e) => setToList(e.target.value)} /></div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>Everyone who submits joins this list. Use lists to target campaigns and trigger Loops.</p>
                    <Select label="Auto-tag new contacts" options={opts(['season-2', 'waitlist', 'newsletter', 'No tag'])} defaultValue="season-2" />
                  </div>
                  <div className="fb__sec">
                    <h3>After submit</h3>
                    <div className="fb__field"><Select label="On completion" options={opts(['Show a message', 'Redirect to a URL', 'Reveal eligibility result'])}
                      value={postAction === 'message' ? 'Show a message' : postAction === 'redirect' ? 'Redirect to a URL' : 'Reveal eligibility result'}
                      onChange={(e) => setPostAction(e.target.value.startsWith('Redirect') ? 'redirect' : e.target.value.startsWith('Reveal') ? 'reveal' : 'message')} /></div>
                    {postAction === 'message' && <label className="fb__field"><span>Thank-you message</span><textarea className="fb__ta" rows={2} defaultValue="You're on the list. Keep an eye on your inbox for what's next." /></label>}
                    {postAction === 'redirect' && <label className="fb__field"><span>Redirect URL</span><input className="fb__ta" defaultValue="https://acme.com/welcome" /></label>}
                    {postAction === 'reveal' && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>After verifying, the visitor sees whether their wallet is eligible and, if so, their allowlist status, computed via ZK against your contracts.</p>}
                    <div className="fb__row"><span>Enrol into a Loop</span><Switch checked={enrol} label="Enrol into a Loop" onChange={setEnrol} /></div>
                    {enrol && <Select options={opts(['Welcome new wallets', 'Post-purchase pack tips', 'Dormant 30d win-back'])} value={enrolAuto} onChange={(e) => setEnrolAuto(e.target.value)} aria-label="Loop" />}
                  </div>
                </>
              )}
            </aside>

            <div className="fb__canvas" role="presentation" onClick={() => setSel(null)}>
              <div style={{ width: '100%', maxWidth: 680, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="fb__toolbar" role="presentation" onClick={(e) => e.stopPropagation()}>
                  <div className="fb__dev">
                    {([['desktop', 'monitor', 'Desktop'], ['mobile', 'smartphone', 'Mobile']] as const).map(([id, ic, l]) => (
                      <button key={id} type="button" className={device === id ? 'on' : ''} onClick={() => setDevice(id)}><Icon name={ic} size={14} />{l}</button>
                    ))}
                  </div>
                  {/* This names the style being previewed. Sitting bare beside Desktop/Mobile
                      it read as a third, broken tab — so it now says what it is and does the
                      thing people tried to do by clicking it: go back and change the style. */}
                  <button type="button" className="fb__style" onClick={() => setStage('style')}
                    title="Change how this form appears">
                    Previewing: <b>{surface === 'hosted' ? 'Hosted page' : `${STYLES.find((s) => s.id === style)!.name} widget`}</b>
                    <Icon name="pencil" size={11} />
                  </button>
                </div>

                {surface === 'hosted' ? (
                  <div className="fb__browser" role="presentation" onClick={(e) => e.stopPropagation()} style={device === 'mobile' ? { maxWidth: 340 } : undefined}>
                    <div className="fb__chrome"><i /><i /><i /><span className="fb__url">forms.onchainsuite.xyz/acme/season-2</span></div>
                    <div className="eu eu--embed" style={{ borderRadius: 0, background: euBg, color: euText }}>{preview}</div>
                  </div>
                ) : style === 'inline' ? (
                  <div className={`fb__mock${device === 'mobile' ? ' fb__mock--mobile' : ''}`} role="presentation" onClick={(e) => e.stopPropagation()}>
                    <div className="fb__mocklines">{[0.7, 0.5].map((w, i) => <div key={i} className="fb__ml" style={{ width: `${w * 100}%` }} />)}</div>
                    <div className="fb__pos--inline"><div className="eu eu--embed" style={{ borderRadius: radius, background: euBg, color: euText }}>{preview}</div></div>
                    <div className="fb__mocklines" style={{ top: 'auto', bottom: 0 }}>{[0.6, 0.8, 0.4].map((w, i) => <div key={i} className="fb__ml" style={{ width: `${w * 100}%` }} />)}</div>
                  </div>
                ) : (
                  <div className={`fb__mock${device === 'mobile' ? ' fb__mock--mobile' : ''}`} role="presentation" onClick={(e) => e.stopPropagation()}>
                    <div className="fb__mocklines">{[0.7, 0.5, 0.8, 0.6, 0.75, 0.5].map((w, i) => <div key={i} className="fb__ml" style={{ width: `${w * 100}%` }} />)}</div>
                    {style === 'popup' && <div className="fb__backdrop" />}
                    <div className={`fb__pos fb__pos--${style}`} style={device === 'mobile' && style !== 'hellobar' ? { width: 'auto', left: 16, right: 16, transform: style === 'popup' ? 'translateY(-50%)' : 'none', top: style === 'popup' ? '50%' : undefined } : undefined}>
                      <div className={`eu${style === 'hellobar' ? ' eu--hellobar' : ''}`} style={{ borderRadius: style === 'hellobar' ? 0 : radius, background: euBg, color: euText, boxShadow: 'var(--elevation-3)' }}>{preview}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : tab === 'submissions' ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Performance</h2>
                <span style={{ flex: 1 }} />
                <Select aria-label="Date range" options={['Last 7 days', 'Last 30 days', 'Last 90 days'].map((v) => ({ value: v, label: v }))}
                  value={subRange} onChange={(e) => setSubRange(e.target.value)} style={{ width: 150 }} />
                <Button variant="secondary" size="s" icon="download" onClick={() => downloadCsv(`${name.trim() || 'form'}-submissions.csv`, [
                  ['Wallet', 'ENS', 'Email', 'Linked via', 'Submitted'],
                  ...SUBS.map((r) => [r.addr, r.ens || '', r.email, r.linked, r.when]),
                ])}>Export CSV</Button>
              </div>
              <div className="funnel">
                <div className="funnel__c"><span><Icon name="eye" size={13} />Views</span><b>9,940</b><i>&nbsp;</i></div>
                <div className="funnel__c"><span><Icon name="mouse-pointer-click" size={13} />Starts</span><b>5,120</b><i>51.5% of views</i></div>
                <div className="funnel__c"><span><Icon name="check" size={13} />Completions</span><b>3,892</b><i>76.0% of starts · 39.2% overall</i></div>
              </div>
              <p style={{ margin: '0 0 20px', fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="trending-down" size={13} />Biggest drop-off: 4,820 visitors saw the form but didn&apos;t start (wallet connect step).</p>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Recent submissions</h3>
              <Table
                rows={SUBS}
                columns={[
                  { key: 'wallet', label: 'Wallet', render: (r) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Identicon address={r.addr} size={22} />{r.ens && <b style={{ fontWeight: 500 }}>{r.ens}</b>}<AddressChip address={r.addr} /></span> },
                  { key: 'email', label: 'Email', render: (r) => <span style={{ fontFamily: r.email ? 'var(--font-mono)' : 'inherit', fontSize: 13, color: r.email ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{r.email || 'No email'}</span> },
                  { key: 'linked', label: 'Linked via', render: (r) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="shield-check" size={13} color="var(--action-primary)" />{r.linked}</span> },
                  { key: 'when', label: 'Submitted', numeric: true, render: (r) => <span style={{ color: 'var(--text-secondary)' }}>{r.when}</span> },
                ]}
              />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '36px 40px' }}>
            <div className="share">
              {surface === 'widget' ? (
                <div className="share__opt">
                  <span className="share__ic"><Icon name="code-xml" size={20} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>Embed widget</b>
                    <p>Paste this snippet into your site or dapp where the form should appear.</p>
                    <div className="share__code">{'<script src="https://cdn.onchainsuite.xyz/forms.js"\n  data-form="acme-connect"></script>'}</div>
                    <div style={{ marginTop: 10 }}><Button variant="secondary" size="s" icon="copy" onClick={async () => toast(await copyText(EMBED) ? 'Embed snippet copied' : 'Copy failed. Select the snippet manually')}>Copy snippet</Button></div>
                  </div>
                </div>
              ) : (
                <div className="share__opt">
                  <span className="share__ic"><Icon name="globe" size={20} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>Hosted page</b>
                    <p>Share this link anywhere. No site needed. We host and secure the page.</p>
                    <div className="share__link"><span>{HOSTED_URL}</span><Button variant="secondary" size="s" icon="copy" onClick={async () => toast(await copyText(HOSTED_URL) ? 'Link copied' : 'Copy failed. Select the link manually')}>Copy</Button></div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                      <Button variant="secondary" size="s" icon="external-link" onClick={() => window.open(`https://${HOSTED_URL}`, '_blank', 'noopener')}>Open</Button>
                      <Button variant="tertiary" size="s" icon="qr-code" onClick={() => setQr(true)}>QR code</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {qr && (
        <Modal title="Hosted form QR" onClose={() => setQr(false)} footer={<Button onClick={() => setQr(false)}>Done</Button>}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <QrBlock text={HOSTED_URL} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{HOSTED_URL}</span>
          </div>
        </Modal>
      )}
    </div>,
    document.body,
  );
}

/* Deterministic QR-style block from the URL — a placeholder pattern, not a scannable code. */
function QrBlock({ text }: { text: string }) {
  const n = 21;
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  const cells: boolean[] = [];
  for (let i = 0; i < n * n; i++) { h = (h ^ (h << 13)) >>> 0; h = (h ^ (h >>> 7)) >>> 0; cells.push((h & 3) === 0); }
  const finder = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  return (
    <svg width={168} height={168} viewBox={`0 0 ${n} ${n}`} aria-label={`QR code for ${text}`} style={{ background: '#fff', padding: 6, borderRadius: 'var(--radius-sm)' }}>
      {Array.from({ length: n }, (_, x) => Array.from({ length: n }, (_, y) => {
        const on = finder(x, y)
          ? (x % 6 === 0 || y % 6 === 0 || (x > 1 && x < 5 && y > 1 && y < 5) || (x >= n - 5 && x <= n - 3 && y > 1 && y < 5) || (x > 1 && x < 5 && y >= n - 5 && y <= n - 3))
          : cells[x * n + y];
        return on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#111" /> : null;
      }))}
    </svg>
  );
}
