import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Modal, useOverlay } from '../components/ui';
import { MERGE_TAGS, ensureFooter, missingRequiredTags, renderTags } from '../data/email';
import { Icon } from '../components/icons';
import type { IconName } from '../components/icons';
import './builders.css';

/* In-app push composer — title / message / deep-link with a live device-notification
   preview. Shared by automation push steps and the campaign push channel. */
export function PushBuilder({ name, onClose }: { name?: string; onClose: () => void }) {
  /* aria-modal hides the rest of the document from assistive tech, so without this a keyboard
     user lands on <body> with everything else hidden: no way in, no way out but a reload. */
  const pushRef = useOverlay(onClose);
  const [title, setTitle] = useState(name && name !== 'Send in-app push' ? name : 'Season 2 packs are live');
  const [body, setBody] = useState('Collect Packs, earn Hammers and take your shot at cracking the vault.');
  const [link, setLink] = useState('acme://season-2');
  return createPortal(
    <div ref={pushRef} className="pb" role="dialog" aria-modal="true" aria-label="In-app push builder">
      <div className="pb__top">
        <button type="button" className="pb__back" onClick={onClose}><Icon name="arrow-left" size={16} />Back to flow</button>
        <span style={{ width: 1, height: 20, background: 'var(--border-default)' }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>In-app push builder</span>
        <span style={{ flex: 1 }} />
        <Button size="s" icon="check" onClick={onClose}>Save push</Button>
      </div>
      <div className="pb__body">
        <div className="pb__fields">
          <label className="pb__f"><span>Title</span><input className="pb__in" value={title} onChange={(e) => setTitle(e.target.value)} /><p className="hint">Keep it under 48 characters. Longer titles clip on the lock screen. ({title.length}/48)</p></label>
          <label className="pb__f"><span>Message</span><textarea className="pb__in" value={body} onChange={(e) => setBody(e.target.value)} /></label>
          <label className="pb__f"><span>Deep link</span><input className="pb__in" value={link} onChange={(e) => setLink(e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }} /><p className="hint">Where the app opens when the push is tapped.</p></label>
        </div>
        <div>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 10 }}>Preview</span>
          <div className="pb__phone">
            <div className="pb__note">
              <span className="pb__app">A</span>
              <span className="pb__nt"><b>{title || 'Notification title'}</b><span>{body || 'Notification message'}</span></span>
              <span className="pb__time">now</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export type BlockType = 'heading' | 'text' | 'button' | 'image' | 'divider' | 'spacer' | 'footer';
export type Block = { id: string; type: BlockType; text?: string; locked?: boolean };

/** Default body for a fresh email, footer already attached. */
export function defaultEmailBlocks(): Block[] {
  return ensureFooter(INITIAL) as Block[];
}

const PALETTE: { type: BlockType; icon: IconName; label: string; text?: string }[] = [
  { type: 'heading', icon: 'heading-1', label: 'Heading', text: 'New heading' },
  { type: 'text', icon: 'type', label: 'Text', text: 'Add your paragraph text here.' },
  { type: 'button', icon: 'square-mouse-pointer', label: 'Button', text: 'Click me' },
  { type: 'image', icon: 'image', label: 'Image', text: 'Drop an image here' },
  { type: 'divider', icon: 'minus', label: 'Divider' },
  { type: 'spacer', icon: 'unfold-vertical', label: 'Spacer' },
];
const LABEL: Record<BlockType, string> = { heading: 'Heading', text: 'Text', button: 'Button', image: 'Image', divider: 'Divider', spacer: 'Spacer', footer: 'Footer · required' };
let bid = 100;
const INITIAL: Block[] = [
  { id: 'b1', type: 'image', text: 'Drop the Season 2 key art here' },
  { id: 'b2', type: 'heading', text: 'Season 2 packs are live' },
  { id: 'b3', type: 'text', text: 'Collect Packs, earn Hammers and take your shot at cracking the vault. Season 2 adds 12 new pack tiers and a bigger prize pool.' },
  { id: 'b4', type: 'button', text: 'Open Acme' },
];

/** Interactive email template editor — add / select / edit / reorder / remove blocks on a
    live canvas, with desktop/mobile preview. Ported from the handoff TemplateEditor. */
export function EmailBuilder({ name = 'Acme is live', onClose, blocks: controlled, onBlocksChange }: {
  name?: string; onClose: () => void;
  /** Optional controlled body — lets the campaign wizard read the content it will send. */
  blocks?: Block[]; onBlocksChange?: (b: Block[]) => void;
}) {
  const edRef = useOverlay(onClose);
  const [tab, setTab] = useState<'blocks' | 'inspect'>('blocks');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  // Every template — seeded, blank or imported — carries the compliance footer.
  const [ownBlocks, setOwnBlocks] = useState<Block[]>(() => defaultEmailBlocks());
  const blocks = controlled ?? ownBlocks;
  const setBlocks = (updater: Block[] | ((prev: Block[]) => Block[])) => {
    const next = typeof updater === 'function' ? (updater as (p: Block[]) => Block[])(blocks) : updater;
    if (onBlocksChange) onBlocksChange(next); else setOwnBlocks(next);
  };
  const [sel, setSel] = useState<string | null>('b2');
  const [importOpen, setImportOpen] = useState(false);
  const selBlock = blocks.find((b) => b.id === sel);
  const contentRef = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  /* Insert at the caret so tags can be dropped mid-sentence, not just appended. */
  const insertTag = (id: string, tag: string) => {
    const el = contentRef.current;
    const cur = blocks.find((b) => b.id === id)?.text ?? '';
    const at = el && typeof el.selectionStart === 'number' ? el.selectionStart : cur.length;
    edit(id, cur.slice(0, at) + tag + cur.slice(at));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + tag.length, at + tag.length); });
  };

  // Sendability check across the whole body — surfaced in the top bar.
  const missing = missingRequiredTags(blocks.map((b) => b.text ?? '').join('\n'));

  const add = (type: BlockType) => {
    const def = PALETTE.find((p) => p.type === type)!;
    const node: Block = { id: 'b' + bid++, type, text: def.text };
    setBlocks((v) => ensureFooter([...v, node]) as Block[]); setSel(node.id); setTab('inspect');
  };
  const remove = (id: string) => { setBlocks((v) => v.filter((b) => b.id !== id || b.locked)); setSel(null); };
  const move = (id: string, dir: -1 | 1) => setBlocks((v) => {
    const body = v.filter((b) => !b.locked);
    const i = body.findIndex((b) => b.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= body.length) return v;
    const next = [...body]; [next[i], next[j]] = [next[j], next[i]];
    return ensureFooter(next) as Block[];
  });
  const edit = (id: string, text: string) => setBlocks((v) => v.map((b) => (b.id === id ? { ...b, text } : b)));

  const render = (b: Block) => {
    if (b.type === 'heading') return <h2>{renderTags(b.text ?? '')}</h2>;
    if (b.type === 'footer') return <span className="ted__foot">{renderTags(b.text ?? '').split('\n').map((l) => <span key={l} style={{ display: 'block' }}>{l}</span>)}</span>;
    if (b.type === 'text') return <p>{renderTags(b.text ?? '')}</p>;
    if (b.type === 'button') return <span className="ted__cta">{renderTags(b.text ?? '')}</span>;
    if (b.type === 'image') return <div className="ted__banner"><Icon name="image" size={22} strokeWidth={1.5} />{b.text}</div>;
    if (b.type === 'divider') return <div className="ted__div" />;
    if (b.type === 'spacer') return <div className="ted__spacer" />;
    return null;
  };

  return createPortal(
    <div ref={edRef} className="ted" role="dialog" aria-modal="true" aria-label="Email template editor">
      <div className="ted__top">
        <button type="button" className="ted__back" onClick={onClose}><Icon name="arrow-left" size={16} />Back to campaign</button>
        <span style={{ width: 1, height: 20, background: 'var(--border-default)' }} />
        <span className="ted__name">{name}</span>
        <div className="ted__seg">
          <button type="button" className={device === 'desktop' ? 'on' : ''} onClick={() => setDevice('desktop')}><Icon name="monitor" size={15} />Desktop</button>
          <button type="button" className={device === 'mobile' ? 'on' : ''} onClick={() => setDevice('mobile')}><Icon name="smartphone" size={15} />Mobile</button>
        </div>
        {missing.length > 0
          ? <span className="ted__warn" title={`Missing: ${missing.join(', ')}`}><Icon name="triangle-alert" size={13} />{missing.length} required tag{missing.length === 1 ? '' : 's'} missing</span>
          : <span className="ted__ok"><Icon name="shield-check" size={13} />Compliant</span>}
        <Button variant="tertiary" size="s" icon="code" onClick={() => setImportOpen(true)}>Import HTML</Button>
        <Button size="s" icon="check" onClick={onClose}>Save template</Button>
      </div>
      <div className="ted__body">
        <aside className="ted__panel">
          <div className="ted__tabs">
            {([['blocks', 'Blocks'], ['inspect', 'Inspect']] as const).map(([id, l]) => (
              <button key={id} type="button" className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{l}</button>
            ))}
          </div>
          <div className="ted__panelbody">
            {tab === 'blocks' ? (
              <>
                <span className="ted__grouplbl">Add a block</span>
                <div className="ted__blocks">
                  {PALETTE.map((p) => (
                    <button key={p.type} type="button" className="ted__block" onClick={() => add(p.type)}><Icon name={p.icon} size={18} strokeWidth={1.75} />{p.label}</button>
                  ))}
                </div>
                <p className="ted__hint">Click a block to append it, then use Inspect to edit its content. Reorder or delete from the toolbar on the selected block.</p>
              </>
            ) : selBlock ? (
              <>
                <span className="ted__grouplbl">{LABEL[selBlock.type]} block</span>
                {selBlock.locked && (
                  <p className="ted__locked">
                    <Icon name="lock" size={13} color="var(--action-primary)" />
                    Required by law. Every email must identify the sender and offer a way to unsubscribe. You can reword it, but it can&apos;t be removed.
                  </p>
                )}
                {selBlock.type === 'divider' || selBlock.type === 'spacer' ? (
                  <p className="ted__hint">No content to edit. Reorder or remove it from the canvas toolbar.</p>
                ) : (
                  <div className="ted__field">
                    <label htmlFor="ted-content">{selBlock.type === 'button' ? 'Button label' : selBlock.type === 'image' ? 'Alt / placeholder' : 'Content'}</label>
                    {selBlock.type === 'text' || selBlock.type === 'footer' ? (
                      <textarea id="ted-content" ref={contentRef} rows={selBlock.type === 'footer' ? 5 : 4} value={selBlock.text ?? ''} onChange={(e) => edit(selBlock.id, e.target.value)} />
                    ) : (
                      <input id="ted-content" ref={contentRef} value={selBlock.text ?? ''} onChange={(e) => edit(selBlock.id, e.target.value)} />
                    )}
                  </div>
                )}
                {selBlock.type !== 'divider' && selBlock.type !== 'spacer' && (
                  <div className="ted__field">
                    <span className="ted__grouplbl" style={{ padding: 0 }}>Insert a merge tag</span>
                    <div className="ted__tags">
                      {MERGE_TAGS.map((t) => (
                        <button key={t.tag} type="button" className={`ted__tag${t.required ? ' req' : ''}`} title={`${t.label} (preview: ${t.sample})`}
                          onClick={() => insertTag(selBlock.id, t.tag)}>{t.label}</button>
                      ))}
                    </div>
                    <p className="ted__hint" style={{ padding: 0 }}>Tags resolve per recipient at send time. The preview shows sample values.</p>
                  </div>
                )}
                {!selBlock.locked && <div style={{ padding: '0 4px' }}><Button variant="tertiary" size="s" icon="trash-2" onClick={() => remove(selBlock.id)}>Remove block</Button></div>}
              </>
            ) : (
              <p className="ted__hint">Select a block on the canvas to edit its content.</p>
            )}
          </div>
        </aside>
        <div className="ted__canvas" role="presentation" onClick={() => setSel(null)}>
          <div className="ted__mail" style={{ maxWidth: device === 'mobile' ? 375 : 640 }} role="presentation" onClick={(e) => e.stopPropagation()}>
            {blocks.length === 0 && <div className="ted__empty">Empty email. Add a block from the left.</div>}
            {blocks.map((b, i) => (
              <div key={b.id} className={`ted__blk${sel === b.id ? ' on' : ''}${b.locked ? ' ted__blk--locked' : ''}`} data-lbl={LABEL[b.type]}
                role="button" tabIndex={0}
                onClick={(e) => { e.stopPropagation(); setSel(b.id); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(b.id); } }}>
                {render(b)}
                <div className="ted__blktools">
                  {b.locked ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 6px', fontSize: 10, fontWeight: 600, color: 'var(--action-primary)' }}>
                      <Icon name="lock" size={11} />Required
                    </span>
                  ) : (
                    <>
                      <button type="button" disabled={i === 0} onClick={(e) => { e.stopPropagation(); move(b.id, -1); }} aria-label="Move up"><Icon name="chevron-up" size={14} /></button>
                      <button type="button" disabled={i >= blocks.filter((x) => !x.locked).length - 1} onClick={(e) => { e.stopPropagation(); move(b.id, 1); }} aria-label="Move down"><Icon name="chevron-down" size={14} /></button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); remove(b.id); }} aria-label="Delete"><Icon name="trash-2" size={13} /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
            <button type="button" className="ted__add" onClick={(e) => { e.stopPropagation(); add('text'); }}><Icon name="plus" size={14} />Add block</button>
          </div>
        </div>
      </div>
      {importOpen && <ImportHtml onClose={() => setImportOpen(false)} onImport={(b) => { setBlocks(ensureFooter(b) as Block[]); setSel(null); setImportOpen(false); }} />}
    </div>,
    document.body,
  );
}

/* Parses pasted HTML into editable blocks — headings, paragraphs, links, images and rules. */
function ImportHtml({ onClose, onImport }: { onClose: () => void; onImport: (b: Block[]) => void }) {
  const [html, setHtml] = useState('');
  const parse = (): Block[] => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const out: Block[] = [];
    doc.body.querySelectorAll('h1,h2,h3,p,a,hr,img').forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const text = (el.textContent || '').trim();
      if (tag === 'hr') out.push({ id: `b${bid++}`, type: 'divider' });
      else if (tag === 'img') out.push({ id: `b${bid++}`, type: 'image', text: el.getAttribute('alt') || 'Imported image' });
      else if (tag === 'a') { if (text) out.push({ id: `b${bid++}`, type: 'button', text }); }
      else if (text) out.push({ id: `b${bid++}`, type: tag === 'p' ? 'text' : 'heading', text });
    });
    return out;
  };
  const count = html.trim() ? parse().length : 0;
  return (
    <Modal title="Import HTML" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={!count} onClick={() => onImport(parse())}>Replace with {count} block{count === 1 ? '' : 's'}</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>Paste an existing email&apos;s HTML. Headings, paragraphs, links, images and rules become editable blocks. This replaces the current content.</p>
        <textarea aria-label="HTML to import" value={html} onChange={(e) => setHtml(e.target.value)} rows={8} spellCheck={false}
          placeholder={'<h1>Season 3</h1>\n<p>Packs are live.</p>\n<a href="#">Open Acme</a>'}
          style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12.5, background: 'var(--bg-surface)', color: 'var(--text-primary)', resize: 'vertical' }} />
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{count} block{count === 1 ? '' : 's'} detected.</span>
      </div>
    </Modal>
  );
}
