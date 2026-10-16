import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Card, ChannelDots, Stat } from '../components/ui';
import { Icon } from '../components/icons';
import { useAsync } from '../data/useAsync';
import { api } from '../data/api';
import { useWorkspaceMode } from '../data/workspace';
import { startTour } from '../data/tour';
import './home.css';

/* The first line of the product should not be wrong. It said "Good afternoon" at every hour
   of the day, which is the cheapest possible thing to get right and the first thing a user
   can catch us on. */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const nav = useNavigate();
  /* Empty: a workspace that has paid and has nothing indexed. The KPIs, the activity feed and
     the running campaign below are the demo's, so they are not shown as if they were theirs. */
  const empty = useWorkspaceMode() === 'empty';
  const [q, setQ] = useState('');
  const kpis = useAsync(api.dashboardKpis, []);
  const activity = useAsync(api.activity, []);

  const ask = () => { if (q.trim()) nav(`/intelligence?q=${encodeURIComponent(q.trim())}`); };

  return (
    <div className="page">
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '30px 28px', marginBottom: 18 }}>
        {/* A real heading, not a styled div — this is the page's only title, so without it
            Dashboard is the one screen a screen reader lands on with no heading at all. */}
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>{greeting()}, Ada.</h1>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          {empty
            ? 'Your workspace is set up. Nothing is indexed yet. Getting started, in the sidebar, is the way in.'
            : 'Here is what moved across your workspace today.'}
        </div>
        {empty && (
          <button type="button" className="home__tour" onClick={startTour}>
            <Icon name="brain" size={15} />Take the tour with Cerebra
          </button>
        )}
      </div>

      {!empty && <>

      <form
        onSubmit={(e) => { e.preventDefault(); ask(); }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '12px 16px', marginBottom: 20, boxShadow: 'var(--elevation-1)' }}
      >
        {/* 1.8 gives the assistant one glyph everywhere — the sparkle is generic AI, the
            brain is Intelligence specifically. Same bar, same behaviour. */}
        <Icon name="brain" size={18} color="var(--action-primary)" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask Intelligence anything, or describe a campaign to build…" aria-label="Assistant prompt"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--text-primary)' }} />
        <button type="submit" aria-label="Send" style={{ width: 34, height: 34, borderRadius: 4, border: 'none', cursor: 'pointer', background: 'var(--action-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrow-up" size={16} />
        </button>
      </form>

      <div className="kpis" style={{ marginBottom: 24 }}>
        {kpis.data?.map((k) => <Stat key={k.label} label={k.label} value={k.value} sub={k.sub} deltaPct={k.deltaPct} spark={k.spark} />)}
        {kpis.loading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="stat"><div className="sk" style={{ height: 60 }} /></div>)}
      </div>

      <div className="two-col">
        <div>
          <div className="section-label">Recent on-chain activity</div>
          <Card pad={false}>
            {activity.data?.map((e, i) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderTop: i ? '1px solid var(--border-subtle)' : 'none' }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: e.status === 'warning' ? 'var(--orange-500)' : e.status === 'error' ? 'var(--red-500)' : e.status === 'success' ? 'var(--green-500)' : 'var(--sky-500)' }} />
                <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>{e.type}</span>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{e.address.slice(0, 6)}…{e.address.slice(-4)}</span> {e.sentence}
                </span>
                <Badge status="neutral" dot={false}>{e.chain}</Badge>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{e.at}</span>
              </div>
            ))}
            {activity.loading && <div className="sk" style={{ height: 180, margin: 16 }} />}
          </Card>
        </div>
        <div>
          {/* Setup sits at the centre of the page, so the rail keeps only the reference view
              of the running campaign. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="section-label">Running now</div>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>Re-engage whales<span style={{ marginLeft: 'auto' }}><Badge status="success" live>Active</Badge></span></div>
              <ChannelDots ids={['email', 'push']} />
              <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 8 }}>6,480 sent · 1,940 engaged · 312 converted</div>
            </Card>
          </div>
        </div>
      </div>
      </>}
    </div>
  );
}



