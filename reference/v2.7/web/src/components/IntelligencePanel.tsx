import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from './icons';
import { AddressChip, Identicon } from './ui';
import { runQuery, type QueryResult } from '../data/queries';
import './intelligence-panel.css';

/* The Intelligence — the assistant, unpinned from its own page.
 *
 * Named Cerebra until the 2.7 rename; the screenshots, the earlier commits and anything
 * written before it still say that. The UI, this file and the `intel` class prefix are the
 * one name now.
 *
 * 2 made Intelligence a destination: to ask anything you left what you were doing. In 2.5
 * it follows you instead, so a question about the campaign you're staring at gets asked
 * where the campaign is. The panel is deliberately not the full workspace — it answers,
 * and hands off to /intelligence for charts, SQL and segment-building. Anything that needs
 * real estate belongs there, not in a 380px drawer.
 *
 * The Shell hides the launcher on /intelligence: on its own page it would cover itself. */

/** Openers change with the route, because the useful question depends on what you're looking at. */
const PROMPTS: { match: string; ask: string[] }[] = [
  { match: '/campaigns', ask: ['Which campaign converted best last month?', 'Wallets that opened but never clicked'] },
  { match: '/audience', ask: ['Top holders by token', 'Which wallets went dormant this month?'] },
  { match: '/automations', ask: ['Which Loop drives the most conversions?', 'Wallets stuck mid-flow'] },
  { match: '/analytics', ask: ['Where is engagement falling off?', 'Best-converting campaign by segment'] },
  { match: '/forms', ask: ['Which form converts best?', 'Wallets that signed up but never bought'] },
];
const FALLBACK = ['Top holders by token', 'Wallets that opened but never clicked', 'Wallet balances across chains'];

/* What Intelligence can *do* with an answer, not just say about it.
 *
 * An assistant that only describes leaves the operator to go and redo the work by hand in
 * another screen — which is exactly the trip the floating panel exists to save. Each action
 * carries the query across, so the segment builder or the wizard opens already populated. */
const ACTIONS: { id: string; label: string; icon: IconName; to: (q: string) => string }[] = [
  { id: 'segment', label: 'Save as segment', icon: 'users', to: (q) => `/intelligence?q=${encodeURIComponent(q)}&do=segment` },
  { id: 'campaign', label: 'Build a campaign', icon: 'megaphone', to: (q) => `/intelligence?q=${encodeURIComponent(q)}&do=campaign` },
];

type Turn = { q: string; r: QueryResult };

export function IntelligencePanel() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const loc = useLocation();
  const nav = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = PROMPTS.find((p) => loc.pathname.startsWith(p.match))?.ask ?? FALLBACK;

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);

  // Newest turn should be in view without the user scrolling for it.
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [turns, open]);

  const ask = (q: string) => {
    const t = q.trim();
    if (!t) return;
    setTurns((v) => [...v, { q: t, r: runQuery(t) }]);
    setDraft('');
  };

  if (!open) {
    return (
      <button type="button" className="intel__fab" onClick={() => setOpen(true)} aria-label="Ask Intelligence">
        <Icon name="brain" size={22} />
      </button>
    );
  }

  return (
    <div className="intel" role="dialog" aria-label="Intelligence">
      <div className="intel__head">
        <span className="intel__badge"><Icon name="brain" size={16} /></span>
        <span className="intel__title"><b>Intelligence</b><span>Knows your on-chain and messaging data</span></span>
        <button type="button" className="intel__ico" aria-label="Open the full Intelligence workspace" title="Open the full workspace" onClick={() => { setOpen(false); nav('/intelligence'); }}>
          <Icon name="external-link" size={15} />
        </button>
        <button type="button" className="intel__ico" aria-label="Close Intelligence" onClick={() => setOpen(false)}>
          <Icon name="minimize-2" size={15} />
        </button>
      </div>

      <div className="intel__scroll" ref={scrollRef}>
        {turns.length === 0 ? (
          <div className="intel__empty">
            <p>Ask about anything on this page, or anything in your workspace.</p>
            <div className="intel__sugg">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => ask(s)}>
                  <Icon name="corner-down-right" size={13} />{s}
                </button>
              ))}
            </div>
          </div>
        ) : turns.map((t, i) => (
          <div key={i} className="intel__turn">
            <div className="intel__q">{t.q}</div>
            <div className="intel__a">
              <span className="intel__aicn"><Icon name="brain" size={14} /></span>
              <div className="intel__abody">
                {t.r.kind === 'data' ? (
                  <>
                    {/* Summaries are written as sentence fragments to sit after "Here's
                        what I found for X —". The question is already above, so the panel
                        supplies the stem instead of repeating it. */}
                    <p>Here&apos;s {t.r.summary}.</p>
                    <div className="intel__rows">
                      {t.r.rows.slice(0, 4).map((r) => (
                        <div className="intel__row" key={r.wallet ?? r.cells.join()}>
                          {r.wallet && <Identicon address={r.wallet} size={20} />}
                          <span className="intel__rowid">{r.ens || (r.wallet ? <AddressChip address={r.wallet} /> : r.cells[0])}</span>
                          <b>{r.cells[0]}</b>
                        </div>
                      ))}
                    </div>
                    <div className="intel__acts">
                      {ACTIONS.map((a) => (
                        <button key={a.id} type="button" className="intel__act" onClick={() => { setOpen(false); nav(a.to(t.q)); }}>
                          <Icon name={a.icon} size={13} />{a.label}
                        </button>
                      ))}
                    </div>
                    <button type="button" className="intel__more" onClick={() => { setOpen(false); nav(`/intelligence?q=${encodeURIComponent(t.q)}`); }}>
                      Open in Intelligence for the chart and SQL<Icon name="arrow-right" size={13} />
                    </button>
                  </>
                ) : t.r.kind === 'empty' ? (
                  <p>The query ran, but no wallets matched. The filter may be too narrow, or that data isn&apos;t indexed yet.</p>
                ) : t.r.kind === 'clarify' ? (
                  <p>That could mean a few things: <button type="button" className="intel__inline" onClick={() => { setOpen(false); nav(`/intelligence?q=${encodeURIComponent(t.q)}`); }}>open the full workspace</button> and I&apos;ll walk through the options.</p>
                ) : (
                  <p>I can&apos;t answer that one. I work over your on-chain activity and messaging engagement. I can&apos;t predict prices or fetch anything off-platform.</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <form className="intel__composer" onSubmit={(e) => { e.preventDefault(); ask(draft); }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask Intelligence…" aria-label="Ask Intelligence" />
        <button type="submit" disabled={!draft.trim()} aria-label="Send"><Icon name="arrow-up" size={16} /></button>
      </form>
    </div>
  );
}
