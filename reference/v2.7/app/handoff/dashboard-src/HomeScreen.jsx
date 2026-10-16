import React from 'react';
import { Icon } from '../../components/icons/Icon.jsx';
import { Button } from '../../components/actions/Button.jsx';
import { IconButton } from '../../components/actions/IconButton.jsx';
import { KPICard } from '../../components/data/KPICard.jsx';
import { Card } from '../../components/data/Card.jsx';
import { Badge } from '../../components/feedback/Badge.jsx';
import { EventCard } from '../../components/product/EventCard.jsx';
import { CampaignFunnel } from '../../components/product/CampaignFunnel.jsx';

const css = `
.osd-home{max-width:1500px;margin:0 auto;padding:8px 40px 48px;display:flex;flex-direction:column;gap:var(--space-8);}
.osd-hero{display:flex;flex-direction:column;gap:6px;padding:8px 4px 0;}
.osd-hero h1{margin:0;font-size:var(--text-heading-xl-size);line-height:var(--text-heading-xl-line);font-weight:600;letter-spacing:-0.5px;color:var(--text-primary);}
.osd-hero p{margin:0;font-size:var(--text-body-l-size);color:var(--text-secondary);}
.osd-prompt{width:100%;background:var(--bg-surface);border:1px solid var(--border-default);
  border-radius:var(--radius-lg);box-shadow:var(--elevation-1);height:56px;display:flex;align-items:center;gap:12px;padding:0 10px 0 18px;box-sizing:border-box;
  transition:border-color var(--duration-fast) var(--ease-standard),box-shadow var(--duration-fast) var(--ease-standard);}
.osd-prompt:focus-within{border-color:var(--border-focus);box-shadow:0 0 0 3px var(--focus-ring);}
.osd-prompt input{flex:1;border:none;outline:none;background:transparent;font-family:inherit;font-size:var(--text-body-m-size);color:var(--text-primary);min-width:0;}
.osd-prompt input::placeholder{color:var(--text-tertiary);}
.osd-prompt__send{width:40px;height:40px;border-radius:var(--radius-md);border:none;background:var(--action-primary);color:var(--text-on-brand);
  display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background var(--duration-fast) var(--ease-standard);}
.osd-prompt__send:hover{background:var(--action-primary-hover);}
.osd-sec__head{display:flex;align-items:center;gap:12px;margin-bottom:16px;}
.osd-sec__head h2{margin:0;font-size:var(--text-heading-l-size);line-height:var(--text-heading-l-line);font-weight:600;letter-spacing:-0.25px;color:var(--text-primary);}
.osd-sec__chip{background:var(--bg-brand-subtle);color:var(--action-primary);font-size:var(--text-label-s-size);font-weight:500;
  letter-spacing:0.2px;padding:3px 10px;border-radius:var(--radius-sm);}
.osd-sec__arrows{margin-left:auto;display:flex;gap:4px;}
.osd-gs__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4);}
.osd-task{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);
  padding:24px;display:flex;flex-direction:column;gap:12px;align-items:flex-start;transition:border-color var(--duration-fast) var(--ease-standard),box-shadow var(--duration-fast) var(--ease-standard);}
.osd-task:hover{border-color:var(--border-strong);box-shadow:var(--elevation-1);}
.osd-task__tile{width:44px;height:44px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;margin-bottom:4px;}
.osd-task__tile--done{background:var(--status-success-bg);color:var(--status-success-text);}
.osd-task__tile--todo{background:var(--bg-brand-subtle);color:var(--action-primary);}
.osd-task h3{margin:0;font-size:var(--text-heading-s-size);font-weight:600;color:var(--text-primary);}
.osd-task p{margin:0;font-size:var(--text-body-s-size);line-height:var(--text-body-s-line);color:var(--text-secondary);flex:1;}
.osd-home__kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4);}
.osd-home__cols{display:grid;grid-template-columns:1.4fr 1fr;gap:var(--space-4);align-items:start;}
.osd-feed{display:flex;flex-direction:column;gap:8px;}
`;
if (typeof document !== 'undefined' && !document.getElementById('osd-home-css')) {
  const s = document.createElement('style'); s.id = 'osd-home-css'; s.textContent = css; document.head.appendChild(s);
}

const TASKS = [
  { icon: 'file-code-2', title: 'Add a contract to index', body: 'Point us at your token or NFT contract so we can discover holders.', cta: 'Done', done: true, go: 'settings' },
  { icon: 'sparkles', title: 'Enrich wallet data', body: 'Pull on-chain metrics for your holders so segments and chat have data.', cta: 'Done', done: true, go: 'intelligence' },
  { icon: 'shield-check', title: 'Verify your sender domain', body: 'Add DKIM & SPF so branded emails land in the inbox, not spam.', cta: 'Verify domain', done: false, go: 'settings' },
  { icon: 'clipboard-list', title: 'Create a capture form', body: 'Turn visitors into ZK-verified, reachable contacts.', cta: 'Build a form', done: false, go: 'forms' },
  { icon: 'users', title: 'Build your first segment', body: 'Describe an audience in plain English and save it for campaigns.', cta: 'Open Intelligence', done: false, go: 'intelligence' },
];

/** Dashboard home. Empty state = onboarding (no data yet); full state = live workspace data. */
export function HomeScreen({ user = 'Olusegun Aborode', filled = false, onAsk, onNavigate }) {
  const firstName = user.split(/\s+/)[0];
  const [q, setQ] = React.useState('');
  const send = () => { if (q.trim() && onAsk) onAsk(q.trim()); };
  return (
    <div className="osd-home">
      <section className="osd-hero">
        <h1>Good morning, {firstName}</h1>
        <p>{filled ? 'Here is what moved across your workspace today.' : 'Time to focus on what matters most.'}</p>
      </section>

      <div className="osd-prompt">
        <Icon name="sparkles" size={20} color="var(--action-primary)" />
        <input placeholder="Ask anything, or describe a campaign to build…" aria-label="Assistant prompt" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
        <IconButton icon="mic" label="Voice input" />
        <button type="button" className="osd-prompt__send" aria-label="Send" disabled={!q.trim()} onClick={send}><Icon name="arrow-up" size={20} strokeWidth={2} /></button>
      </div>

      {filled ? (
        <React.Fragment>
          <div className="osd-home__kpis">
            <KPICard label="ACTIVE WALLETS" value="128,540" delta={12.4} period="vs last 30d" spark={[4, 5, 4, 6, 7, 8, 9, 11]} />
            <KPICard label="MESSAGES SENT" value="12,480" delta={4.1} period="vs last 30d" spark={[8, 7, 9, 8, 10, 11, 12, 12]} />
            <KPICard label="OPEN RATE" value="42.3" unit="%" delta={2.7} period="vs last 30d" spark={[6, 7, 6, 8, 7, 9, 9, 10]} />
            <KPICard label="CONVERTED ON-CHAIN" value="3,921" delta={22.7} period="vs last 30d" spark={[2, 3, 2, 4, 5, 6, 7, 9]} />
          </div>
          <section>
            <div className="osd-sec__head">
              <h2>Today</h2>
              <Badge status="info" live>Live</Badge>
              <span className="osd-sec__arrows"><Button variant="tertiary" size="s" icon="pause">Pause stream</Button></span>
            </div>
            <div className="osd-home__cols">
              <Card compact style={{ overflow: 'hidden' }}>
                <div className="osd-feed">
                  <EventCard type="Swap" status="success" chain="Base" timestamp="14:36 UTC"
                    sentence={<span><span className="os-mono">0x1A2b…9F3e</span> swapped 4.2 ETH → USDC on Uniswap</span>}
                    payload={{ event: 'Swap', amountIn: '4.2 ETH', amountOut: '14,830 USDC' }} />
                  <EventCard type="Unstake" status="warning" chain="Ethereum" timestamp="14:12 UTC"
                    sentence={<span><span className="os-mono">0x8Cc4…21aB</span> unstaked 12 ETH from Lido</span>}
                    payload={{ event: 'Unstake', amount: '12 ETH' }} />
                  <EventCard type="Mint" status="info" chain="Base" timestamp="13:58 UTC"
                    sentence={<span><span className="os-mono">0xF31d…77c0</span> minted 3 items from Zora drop</span>}
                    payload={{ event: 'Mint', quantity: 3 }} />
                </div>
              </Card>
              <CampaignFunnel title="Re-engage whales" status="success" statusLabel="Active" stages={[
                { label: 'Sent', value: 48920 },
                { label: 'Delivered', value: 47061 },
                { label: 'Engaged', value: 12480 },
                { label: 'Converted on-chain', value: 3921 },
              ]} />
            </div>
          </section>
        </React.Fragment>
      ) : (
        <section>
          <div className="osd-sec__head">
            <h2>Get started</h2>
            <span className="osd-sec__chip">2 OF 5 DONE</span>
            <span className="osd-sec__arrows">
              <IconButton icon="arrow-left" label="Previous tasks" />
              <IconButton icon="arrow-right" label="Next tasks" />
            </span>
          </div>
          <div className="osd-gs__grid">
            {TASKS.map((t) => (
              <div className="osd-task" key={t.title}>
                <span className={`osd-task__tile ${t.done ? 'osd-task__tile--done' : 'osd-task__tile--todo'}`}>
                  <Icon name={t.done ? 'check' : t.icon} size={22} strokeWidth={2} />
                </span>
                <h3>{t.title}</h3>
                <p>{t.body}</p>
                <Button variant={t.done ? 'secondary' : 'primary'} onClick={() => onNavigate && onNavigate(t.go)}>{t.cta}</Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
