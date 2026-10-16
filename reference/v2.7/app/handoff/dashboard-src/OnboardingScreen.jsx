import React from 'react';
import { Icon } from '../../components/icons/Icon.jsx';
import { Button } from '../../components/actions/Button.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { Chip } from '../../components/feedback/Chip.jsx';

const css = `
.osd-ob{min-height:100vh;background:var(--bg-page);font-family:var(--font-sans);display:flex;flex-direction:column;align-items:center;padding:48px 24px 64px;box-sizing:border-box;overflow-y:auto;}
.osd-ob__logo{height:34px;margin-bottom:32px;}
.osd-ob__card{width:min(640px,100%);background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-xl,16px);box-shadow:var(--elevation-2);overflow:hidden;}
.osd-ob__hd{padding:26px 28px 22px;border-bottom:1px solid var(--border-subtle);}
.osd-ob__hd h1{margin:0 0 6px;font-size:var(--text-heading-l-size,24px);font-weight:600;letter-spacing:-0.4px;color:var(--text-primary);}
.osd-ob__hd p{margin:0;font-size:var(--text-body-s-size);color:var(--text-secondary);}
.osd-ob__prog{display:flex;align-items:center;gap:8px;margin-top:16px;}
.osd-ob__track{flex:1;height:6px;border-radius:99px;background:var(--surface-subtle);overflow:hidden;}
.osd-ob__fill{height:100%;border-radius:99px;background:var(--action-primary);transition:width var(--duration-base) var(--ease-standard);}
.osd-ob__count{font-size:var(--text-caption-size);font-weight:500;color:var(--text-tertiary);font-variant-numeric:tabular-nums;}
.osd-ob__steps{display:flex;flex-direction:column;}
.osd-ob__step{display:flex;gap:14px;padding:18px 28px;border-bottom:1px solid var(--border-subtle);align-items:flex-start;}
.osd-ob__step:last-child{border-bottom:none;}
.osd-ob__n{width:30px;height:30px;border-radius:99px;border:2px solid var(--border-strong);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:var(--text-tertiary);flex-shrink:0;background:var(--bg-surface);}
.osd-ob__step--done .osd-ob__n{border-color:var(--action-primary);background:var(--action-primary);color:#fff;}
.osd-ob__step--active .osd-ob__n{border-color:var(--action-primary);color:var(--action-primary);}
.osd-ob__body{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;}
.osd-ob__body h3{margin:0;font-size:var(--text-label-m-size);font-weight:600;color:var(--text-primary);}
.osd-ob__body p{margin:0;font-size:var(--text-caption-size);color:var(--text-secondary);line-height:1.5;}
.osd-ob__form{display:flex;flex-direction:column;gap:12px;margin-top:12px;}
.osd-ob__actions{display:flex;gap:10px;margin-top:14px;}
.osd-ob__done{display:inline-flex;align-items:center;gap:6px;font-size:var(--text-caption-size);font-weight:500;color:var(--action-primary);margin-top:6px;}
.osd-ob__ft{display:flex;align-items:center;padding:20px 28px;background:var(--surface-subtle);}
.osd-ob__skip{border:none;background:none;font-family:inherit;font-size:var(--text-label-m-size);font-weight:500;color:var(--text-secondary);cursor:pointer;}
.osd-ob__skip:hover{color:var(--text-primary);}
.osd-ob__flow{display:flex;align-items:center;gap:6px;}
.osd-ob__fnode{flex:1;display:flex;flex-direction:column;gap:5px;padding:12px;border:1px solid var(--border-subtle);border-radius:var(--radius-md);background:var(--bg-surface);min-width:0;}
.osd-ob__fnode i{width:28px;height:28px;border-radius:var(--radius-sm);background:var(--bg-selected);color:var(--action-primary);display:flex;align-items:center;justify-content:center;}
.osd-ob__fnode b{font-size:12px;font-weight:600;color:var(--text-primary);}
.osd-ob__fnode em{font-style:normal;font-size:11px;color:var(--text-tertiary);line-height:1.4;}
.osd-ob__farrow{display:flex;align-items:center;color:var(--border-strong);flex-shrink:0;}
.osd-ob__note{display:flex;align-items:flex-start;gap:9px;padding:10px 12px;border-radius:var(--radius-md);background:var(--bg-selected);border:1px solid var(--border-default);}
.osd-ob__note span{font-size:var(--text-caption-size);color:var(--text-secondary);line-height:1.5;}
.osd-ob__dns{border:1px solid var(--border-subtle);border-radius:var(--radius-md);overflow:hidden;}
.osd-ob__dnsrow{display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid var(--border-subtle);}
.osd-ob__dnsrow:last-child{border-bottom:none;}
.osd-ob__dnstype{font-size:10px;font-weight:700;letter-spacing:0.4px;color:var(--text-tertiary);background:var(--surface-subtle);border-radius:var(--radius-sm);padding:2px 7px;flex-shrink:0;}
.osd-ob__dnshost{font-family:var(--font-mono);font-size:12px;color:var(--text-primary);flex-shrink:0;}
.osd-ob__dnsval{font-family:var(--font-mono);font-size:12px;color:var(--text-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;}
`;
if (typeof document !== 'undefined' && !document.getElementById('osd-ob-css')) {
  const s = document.createElement('style'); s.id = 'osd-ob-css'; s.textContent = css; document.head.appendChild(s);
}

const STEPS = [
  { id: 'contract', icon: 'file-code-2', title: 'Add a contract to index', desc: 'Point us at any contract — token, NFT, staking vault, or custom — name it and tell us which activity to track. We discover the wallets behind it.' },
  { id: 'enrich', icon: 'sparkles', title: 'Enrich wallet data', desc: 'Pull balances, activity and history for those wallets so segments and Intelligence have real data to work with.' },
  { id: 'sender', icon: 'shield-check', title: 'Verify your sender domain', desc: 'Add DKIM & SPF records so branded emails land in the inbox, not spam.' },
];
const EVENTS = ['Mint', 'Purchase', 'Deposit', 'Withdrawal', 'Transfer', 'Stake', 'Unstake'];

/** First-run setup gate — walks a new workspace through indexing, enrichment, sender
    verification and a first capture form before entering the dashboard. Skippable. */
export function OnboardingScreen({ onDone, onSkip, logoSrc = '../../assets/logos/logo-coloured-light.svg' }) {
  const [active, setActive] = React.useState(0);
  const [done, setDone] = React.useState([]);
  const [events, setEvents] = React.useState(['Mint', 'Transfer']);
  const toggleEvent = (e) => setEvents((v) => (v.includes(e) ? v.filter((x) => x !== e) : [...v, e]));
  const complete = (i) => { setDone((v) => (v.includes(i) ? v : [...v, i])); setActive(Math.min(i + 1, STEPS.length - 1)); };
  const pct = Math.round((done.length / STEPS.length) * 100);
  const allDone = done.length === STEPS.length;

  const stepForm = (i) => {
    if (i === 0) return (
      <div className="osd-ob__form">
        <Input label="Contract name" placeholder="e.g. Vault77 Packs" />
        <Input label="Contract address" defaultValue="0x" placeholder="0x… any contract" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="Contract type" options={['ERC-20 token', 'ERC-721 NFT', 'ERC-1155 multi-token', 'Staking / deposit vault', 'Custom contract']} defaultValue="ERC-721 NFT" />
          <Select label="Chain" options={['Base', 'Ethereum', 'Arbitrum', 'Optimism', 'Polygon']} defaultValue="Base" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 'var(--text-label-m-size)', fontWeight: 500, color: 'var(--text-primary)' }}>Activity to track</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EVENTS.map((e) => <Chip key={e} selected={events.includes(e)} onClick={() => toggleEvent(e)}>{e}</Chip>)}
          </div>
          <p style={{ margin: 0, fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>We index these events to build holder lists and activity history — not every contract is a plain token or NFT. Add or change events any time.</p>
        </div>
        <div className="osd-ob__actions"><Button size="s" icon="plus" onClick={() => complete(0)}>Add contract</Button></div>
      </div>
    );
    if (i === 1) return (
      <div className="osd-ob__form">
        <div className="osd-ob__flow">
          <div className="osd-ob__fnode"><i><Icon name="users" size={15} /></i><b>Discover holders</b><em>From the contract you added</em></div>
          <span className="osd-ob__farrow"><Icon name="chevron-right" size={16} /></span>
          <div className="osd-ob__fnode"><i><Icon name="sparkles" size={15} /></i><b>Pull metrics</b><em>Balances, activity, history</em></div>
          <span className="osd-ob__farrow"><Icon name="chevron-right" size={16} /></span>
          <div className="osd-ob__fnode"><i><Icon name="layers" size={15} /></i><b>Ready to segment</b><em>Feeds segments & Intelligence</em></div>
        </div>
        <div className="osd-ob__note">
          <Icon name="info" size={15} color="var(--action-primary)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Your free plan enriches the <b style={{ color: 'var(--text-primary)' }}>first 5 wallets</b> so you can see how it works end to end. Upgrade to enrich every holder in your contract.</span>
        </div>
        <div className="osd-ob__actions"><Button size="s" icon="sparkles" onClick={() => complete(1)}>Enrich 5 wallets free</Button><Button variant="tertiary" size="s" onClick={() => complete(1)}>Skip for now</Button></div>
      </div>
    );
    return (
      <div className="osd-ob__form">
        <Input label="Sending domain" defaultValue="mail.vault77.com" />
        <div className="osd-ob__flow">
          <div className="osd-ob__fnode"><i><Icon name="list-plus" size={15} /></i><b>Add DNS records</b><em>In your registrar</em></div>
          <span className="osd-ob__farrow"><Icon name="chevron-right" size={16} /></span>
          <div className="osd-ob__fnode"><i><Icon name="refresh-cw" size={15} /></i><b>We check</b><em>Propagation, ~a few min</em></div>
          <span className="osd-ob__farrow"><Icon name="chevron-right" size={16} /></span>
          <div className="osd-ob__fnode"><i><Icon name="badge-check" size={15} /></i><b>Verified</b><em>Branded email sends</em></div>
        </div>
        <div className="osd-ob__dns">
          {[['TXT', 'vault77._domainkey', 'v=DKIM1; k=rsa; p=MIGfMA0GCSq…'], ['TXT', '@', 'v=spf1 include:onchainsuite.xyz ~all']].map(([type, host, val]) => (
            <div className="osd-ob__dnsrow" key={host}>
              <span className="osd-ob__dnstype">{type}</span>
              <span className="osd-ob__dnshost">{host}</span>
              <span className="osd-ob__dnsval">{val}</span>
              <Icon name="copy" size={14} color="var(--text-tertiary)" />
            </div>
          ))}
        </div>
        <div className="osd-ob__actions"><Button size="s" icon="shield-check" onClick={() => complete(2)}>Verify domain</Button><Button variant="tertiary" size="s" onClick={() => complete(2)}>I'll do this later</Button></div>
      </div>
    );
  };

  return (
    <div className="osd-ob">
      {logoSrc ? <img className="osd-ob__logo" src={logoSrc} alt="Onchain Suite" /> : null}
      <div className="osd-ob__card">
        <div className="osd-ob__hd">
          <h1>Set up your workspace</h1>
          <p>Three quick steps to turn on-chain activity into an audience you can reach.</p>
          <div className="osd-ob__prog">
            <div className="osd-ob__track"><div className="osd-ob__fill" style={{ width: `${pct}%` }}></div></div>
            <span className="osd-ob__count">{done.length}/{STEPS.length}</span>
          </div>
        </div>
        <div className="osd-ob__steps">
          {STEPS.map((s, i) => {
            const isDone = done.includes(i);
            const isActive = active === i && !isDone;
            return (
              <div key={s.id} className={`osd-ob__step${isDone ? ' osd-ob__step--done' : ''}${isActive ? ' osd-ob__step--active' : ''}`}>
                <span className="osd-ob__n">{isDone ? <Icon name="check" size={15} strokeWidth={3} /> : i + 1}</span>
                <div className="osd-ob__body">
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                  {isActive ? stepForm(i) : null}
                  {isDone ? <span className="osd-ob__done"><Icon name="check" size={13} />Done</span> : null}
                  {!isActive && !isDone ? <div className="osd-ob__actions"><Button variant="secondary" size="s" onClick={() => setActive(i)}>Start</Button></div> : null}
                </div>
              </div>
            );
          })}
        </div>
        <div className="osd-ob__ft">
          <button type="button" className="osd-ob__skip" onClick={onSkip}>Skip for now</button>
          <span style={{ flex: 1 }}></span>
          <Button icon={allDone ? 'arrow-right' : undefined} trailingIcon={allDone ? undefined : 'arrow-right'} onClick={onDone}>{allDone ? 'Enter dashboard' : 'Continue to dashboard'}</Button>
        </div>
      </div>
    </div>
  );
}
