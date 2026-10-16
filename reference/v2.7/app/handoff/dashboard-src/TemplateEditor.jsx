import React from 'react';
import { Icon } from '../../components/icons/Icon.jsx';
import { Button } from '../../components/actions/Button.jsx';

const css = `
.osd-ted{position:fixed;inset:0;z-index:200;background:var(--bg-page);display:flex;flex-direction:column;font-family:var(--font-sans);}
.osd-ted__top{height:56px;display:flex;align-items:center;gap:12px;padding:0 16px;background:var(--bg-surface);border-bottom:1px solid var(--border-default);flex-shrink:0;}
.osd-ted__back{display:inline-flex;align-items:center;gap:8px;border:none;background:none;font-family:inherit;font-size:var(--text-label-m-size);font-weight:500;color:var(--text-secondary);cursor:pointer;padding:8px 10px;border-radius:var(--radius-md);}
.osd-ted__back:hover{background:var(--surface-hover);color:var(--text-primary);}
.osd-ted__name{font-size:var(--text-label-m-size);font-weight:600;color:var(--text-primary);}
.osd-ted__seg{display:inline-flex;background:var(--surface-subtle);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:3px;gap:2px;margin:0 auto;}
.osd-ted__seg button{display:inline-flex;align-items:center;gap:7px;border:none;background:none;font-family:inherit;font-size:var(--text-label-s-size);font-weight:500;color:var(--text-secondary);padding:6px 14px;border-radius:var(--radius-sm);cursor:pointer;}
.osd-ted__seg button.on{background:var(--bg-surface);color:var(--text-primary);box-shadow:var(--elevation-1);}
.osd-ted__body{flex:1;display:flex;min-height:0;}
.osd-ted__panel{width:264px;background:var(--bg-surface);border-right:1px solid var(--border-default);display:flex;flex-direction:column;flex-shrink:0;}
.osd-ted__tabs{display:flex;gap:2px;padding:10px 12px 0;border-bottom:1px solid var(--border-subtle);}
.osd-ted__tabs button{border:none;background:none;font-family:inherit;font-size:var(--text-label-s-size);font-weight:500;color:var(--text-secondary);padding:8px 12px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;}
.osd-ted__tabs button.on{color:var(--text-primary);border-bottom-color:var(--action-primary);}
.osd-ted__panelbody{flex:1;overflow-y:auto;padding:16px 12px;display:flex;flex-direction:column;gap:16px;}
.osd-ted__grouplbl{font-size:var(--text-label-s-size);font-weight:500;letter-spacing:0.2px;text-transform:uppercase;color:var(--text-tertiary);padding:0 4px;}
.osd-ted__blocks{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.osd-ted__block{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 8px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-surface);font-family:inherit;font-size:var(--text-caption-size);font-weight:500;color:var(--text-secondary);cursor:pointer;transition:border-color var(--duration-fast) var(--ease-standard),background var(--duration-fast) var(--ease-standard);}
.osd-ted__block:hover{border-color:var(--action-primary);background:var(--bg-selected);color:var(--action-primary);}
.osd-ted__hint{font-size:var(--text-caption-size);color:var(--text-tertiary);line-height:1.5;padding:0 4px;margin:0;}
.osd-ted__field{display:flex;flex-direction:column;gap:6px;padding:0 4px;}
.osd-ted__field label{font-size:var(--text-label-s-size);font-weight:500;color:var(--text-primary);}
.osd-ted__field textarea,.osd-ted__field input{width:100%;box-sizing:border-box;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-surface);padding:8px 10px;font-family:inherit;font-size:var(--text-body-s-size);color:var(--text-primary);outline:none;resize:vertical;}
.osd-ted__field textarea:focus,.osd-ted__field input:focus{border-color:var(--border-focus);box-shadow:0 0 0 3px var(--focus-ring);}
.osd-ted__canvas{flex:1;overflow-y:auto;padding:36px 32px;display:flex;justify-content:center;}
.osd-ted__mail{width:100%;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-md);box-shadow:var(--elevation-2);height:fit-content;padding:24px 24px 20px;box-sizing:border-box;display:flex;flex-direction:column;gap:2px;transition:max-width var(--duration-base) var(--ease-standard);}
.osd-ted__blk{position:relative;border:1.5px solid transparent;border-radius:var(--radius-sm);padding:8px 10px;cursor:pointer;}
.osd-ted__blk:hover{border-color:var(--border-strong);}
.osd-ted__blk.on{border-color:var(--action-primary);}
.osd-ted__blk.on::after{content:attr(data-lbl);position:absolute;top:-9px;left:8px;background:var(--action-primary);color:#fff;font-size:10px;font-weight:600;padding:1px 7px;border-radius:3px;letter-spacing:0.3px;}
.osd-ted__blktools{position:absolute;top:-11px;right:6px;display:none;gap:2px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-sm);box-shadow:var(--elevation-1);padding:2px;z-index:2;}
.osd-ted__blk.on .osd-ted__blktools{display:flex;}
.osd-ted__blktools button{width:22px;height:22px;border:none;background:none;border-radius:3px;color:var(--text-secondary);display:flex;align-items:center;justify-content:center;cursor:pointer;}
.osd-ted__blktools button:hover{background:var(--surface-hover);color:var(--text-primary);}
.osd-ted__blktools button:disabled{opacity:0.35;cursor:not-allowed;}
.osd-ted__banner{height:130px;border-radius:var(--radius-sm);background:var(--bg-selected);color:var(--action-primary);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;font-size:var(--text-caption-size);font-weight:500;}
.osd-ted__mail h2{margin:0;font-size:22px;font-weight:600;letter-spacing:-0.2px;color:var(--text-primary);}
.osd-ted__mail p{margin:0;font-size:13px;line-height:1.55;color:var(--text-secondary);}
.osd-ted__cta{display:inline-block;align-self:flex-start;background:var(--action-primary);color:#fff;font-size:13px;font-weight:600;padding:9px 18px;border-radius:var(--radius-sm);}
.osd-ted__div{height:1px;background:var(--border-subtle);margin:6px 0;}
.osd-ted__spacer{height:24px;}
.osd-ted__foot{font-size:11px;color:var(--text-tertiary);}
.osd-ted__empty{border:1.5px dashed var(--border-default);border-radius:var(--radius-md);padding:40px;text-align:center;color:var(--text-tertiary);font-size:var(--text-body-s-size);}
.osd-ted__add{display:flex;align-items:center;justify-content:center;gap:8px;border:1.5px dashed var(--border-default);border-radius:var(--radius-sm);padding:12px;margin-top:6px;color:var(--text-tertiary);font-size:var(--text-caption-size);font-weight:500;cursor:pointer;background:none;font-family:inherit;}
.osd-ted__add:hover{border-color:var(--action-primary);color:var(--action-primary);background:var(--bg-selected);}
`;
if (typeof document !== 'undefined' && !document.getElementById('osd-ted-css')) {
  const s = document.createElement('style'); s.id = 'osd-ted-css'; s.textContent = css; document.head.appendChild(s);
}

const PALETTE = [
  { type: 'heading', icon: 'heading-1', label: 'Heading', text: 'New heading' },
  { type: 'text', icon: 'type', label: 'Text', text: 'Add your paragraph text here.' },
  { type: 'button', icon: 'square-mouse-pointer', label: 'Button', text: 'Click me' },
  { type: 'image', icon: 'image', label: 'Image', text: 'Drop an image here' },
  { type: 'divider', icon: 'minus', label: 'Divider' },
  { type: 'spacer', icon: 'unfold-vertical', label: 'Spacer' },
];
const LABEL = { heading: 'HEADING', text: 'TEXT', button: 'BUTTON', image: 'IMAGE', divider: 'DIVIDER', spacer: 'SPACER' };
let bid = 100;
const INITIAL = [
  { id: 'b1', type: 'image', text: 'Drop the Season 2 key art here' },
  { id: 'b2', type: 'heading', text: 'Season 2 packs are live' },
  { id: 'b3', type: 'text', text: 'Collect Packs, earn Hammers, and take your shot at cracking the vault. Season 2 adds 12 new pack tiers and a bigger prize pool.' },
  { id: 'b4', type: 'button', text: 'Open Vault77' },
  { id: 'b5', type: 'divider' },
  { id: 'b6', type: 'text', text: "Sent by Vault77 · You're getting this because you opted in · Unsubscribe" },
];

/** Interactive email template editor — add / select / edit / reorder / remove blocks, desktop/mobile preview. */
export function TemplateEditor({ name = 'Vault77 is Live', onClose }) {
  const [tab, setTab] = React.useState('blocks');
  const [device, setDevice] = React.useState('desktop');
  const [blocks, setBlocks] = React.useState(INITIAL);
  const [sel, setSel] = React.useState('b2');
  const selBlock = blocks.find((b) => b.id === sel);
  const add = (type) => {
    const def = PALETTE.find((p) => p.type === type);
    const node = { id: 'b' + bid++, type, text: def.text };
    setBlocks((v) => [...v, node]); setSel(node.id); setTab('inspect');
  };
  const remove = (id) => { setBlocks((v) => v.filter((b) => b.id !== id)); setSel(null); };
  const move = (id, dir) => setBlocks((v) => {
    const i = v.findIndex((b) => b.id === id); const j = i + dir;
    if (j < 0 || j >= v.length) return v;
    const next = [...v]; [next[i], next[j]] = [next[j], next[i]]; return next;
  });
  const edit = (id, text) => setBlocks((v) => v.map((b) => (b.id === id ? { ...b, text } : b)));

  const render = (b) => {
    if (b.type === 'heading') return <h2>{b.text}</h2>;
    if (b.type === 'text') return b.text.includes('Unsubscribe') ? <span className="osd-ted__foot">{b.text}</span> : <p>{b.text}</p>;
    if (b.type === 'button') return <span className="osd-ted__cta">{b.text}</span>;
    if (b.type === 'image') return <div className="osd-ted__banner"><Icon name="image" size={22} strokeWidth={1.5} />{b.text}</div>;
    if (b.type === 'divider') return <div className="osd-ted__div"></div>;
    if (b.type === 'spacer') return <div className="osd-ted__spacer"></div>;
    return null;
  };

  return (
    <div className="osd-ted" data-screen-label="Template editor">
      <div className="osd-ted__top">
        <button type="button" className="osd-ted__back" onClick={onClose}><Icon name="arrow-left" size={16} />Back to campaign</button>
        <span style={{ width: 1, height: 20, background: 'var(--border-default)' }}></span>
        <span className="osd-ted__name">{name}</span>
        <div className="osd-ted__seg">
          <button type="button" className={device === 'desktop' ? 'on' : ''} onClick={() => setDevice('desktop')}><Icon name="monitor" size={15} />Desktop</button>
          <button type="button" className={device === 'mobile' ? 'on' : ''} onClick={() => setDevice('mobile')}><Icon name="smartphone" size={15} />Mobile</button>
        </div>
        <Button variant="tertiary" size="s" icon="code">Import HTML</Button>
        <Button size="s" icon="check" onClick={onClose}>Save template</Button>
      </div>
      <div className="osd-ted__body">
        <aside className="osd-ted__panel">
          <div className="osd-ted__tabs">
            {[['blocks', 'Blocks'], ['inspect', 'Inspect']].map(([id, l]) => (
              <button key={id} type="button" className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{l}</button>
            ))}
          </div>
          <div className="osd-ted__panelbody">
            {tab === 'blocks' ? (
              <React.Fragment>
                <span className="osd-ted__grouplbl">Add a block</span>
                <div className="osd-ted__blocks">
                  {PALETTE.map((p) => (
                    <button key={p.type} type="button" className="osd-ted__block" onClick={() => add(p.type)}><Icon name={p.icon} size={18} strokeWidth={1.75} />{p.label}</button>
                  ))}
                </div>
                <p className="osd-ted__hint">Click a block to append it, then use Inspect to edit its content. Reorder or delete from the toolbar on the selected block.</p>
              </React.Fragment>
            ) : selBlock ? (
              <React.Fragment>
                <span className="osd-ted__grouplbl">{LABEL[selBlock.type]} block</span>
                {selBlock.type === 'divider' || selBlock.type === 'spacer' ? (
                  <p className="osd-ted__hint">No content to edit — reorder or remove it from the canvas toolbar.</p>
                ) : (
                  <div className="osd-ted__field">
                    <label>{selBlock.type === 'button' ? 'Button label' : selBlock.type === 'image' ? 'Alt / placeholder' : 'Content'}</label>
                    {selBlock.type === 'text' ? (
                      <textarea rows={4} value={selBlock.text} onChange={(e) => edit(selBlock.id, e.target.value)} />
                    ) : (
                      <input value={selBlock.text} onChange={(e) => edit(selBlock.id, e.target.value)} />
                    )}
                  </div>
                )}
                <div style={{ padding: '0 4px' }}><Button variant="tertiary" size="s" icon="trash-2" onClick={() => remove(selBlock.id)}>Remove block</Button></div>
              </React.Fragment>
            ) : (
              <p className="osd-ted__hint">Select a block on the canvas to edit its content.</p>
            )}
          </div>
        </aside>
        <div className="osd-ted__canvas" onClick={() => setSel(null)}>
          <div className="osd-ted__mail" style={{ maxWidth: device === 'mobile' ? 375 : 640 }} onClick={(e) => e.stopPropagation()}>
            {blocks.length === 0 ? <div className="osd-ted__empty">Empty email — add a block from the left.</div> : null}
            {blocks.map((b, i) => (
              <div key={b.id} className={`osd-ted__blk${sel === b.id ? ' on' : ''}`} data-lbl={LABEL[b.type]} onClick={(e) => { e.stopPropagation(); setSel(b.id); }}>
                {render(b)}
                <div className="osd-ted__blktools">
                  <button type="button" disabled={i === 0} onClick={(e) => { e.stopPropagation(); move(b.id, -1); }} aria-label="Move up"><Icon name="chevron-up" size={14} /></button>
                  <button type="button" disabled={i === blocks.length - 1} onClick={(e) => { e.stopPropagation(); move(b.id, 1); }} aria-label="Move down"><Icon name="chevron-down" size={14} /></button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); remove(b.id); }} aria-label="Delete"><Icon name="trash-2" size={13} /></button>
                </div>
              </div>
            ))}
            <button type="button" className="osd-ted__add" onClick={(e) => { e.stopPropagation(); add('text'); }}><Icon name="plus" size={14} />Add block</button>
          </div>
        </div>
      </div>
    </div>
  );
}
