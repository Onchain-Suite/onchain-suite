import React from 'react';
import { Icon } from '../../components/icons/Icon.jsx';
import { Button } from '../../components/actions/Button.jsx';
import { Badge } from '../../components/feedback/Badge.jsx';

const css = `
.osd-set{max-width:1200px;margin:0 auto;padding:8px 40px 56px;display:flex;flex-direction:column;gap:var(--space-5);font-family:var(--font-sans);}
.osd-set__head h1{margin:0;font-size:var(--text-heading-xl-size);line-height:var(--text-heading-xl-line);font-weight:600;letter-spacing:-0.5px;color:var(--text-primary);}
.osd-set__layout{display:grid;grid-template-columns:200px minmax(0,1fr);gap:var(--space-7,40px);align-items:start;}
.osd-set__nav{display:flex;flex-direction:column;gap:2px;position:sticky;top:8px;}
.osd-set__tab{display:flex;align-items:center;gap:10px;padding:9px 12px;border:none;background:none;border-radius:var(--radius-md);font-family:inherit;font-size:var(--text-label-m-size);font-weight:500;color:var(--text-secondary);cursor:pointer;text-align:left;transition:background var(--duration-fast) var(--ease-standard),color var(--duration-fast) var(--ease-standard);}
.osd-set__tab:hover{background:var(--surface-hover);color:var(--text-primary);}
.osd-set__tab--active{background:var(--bg-selected);color:var(--text-primary);}
.osd-set__tab--active .osd-set__ticn{color:var(--action-primary);}
.osd-set__ticn{display:flex;color:var(--text-tertiary);}
.osd-set__content{display:flex;flex-direction:column;gap:var(--space-4);}
.osd-sec{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);}
.osd-sec__bar{display:flex;align-items:center;gap:14px;padding:18px 24px;border-bottom:1px solid var(--border-subtle);}
.osd-sec__meta{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;}
.osd-sec__meta h2{margin:0;font-size:var(--text-heading-s-size,16px);font-weight:600;color:var(--text-primary);}
.osd-sec__meta p{margin:0;font-size:var(--text-caption-size);color:var(--text-tertiary);}
.osd-sec__body{padding:18px 24px 22px;}
.osd-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px 36px;}
.osd-fld__label{font-size:var(--text-label-s-size);font-weight:500;letter-spacing:0.3px;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:4px;}
.osd-fld__value{font-size:var(--text-body-m-size);color:var(--text-primary);}
.osd-fld__value--muted{color:var(--text-tertiary);}
.osd-fld__value.os-mono{font-family:var(--font-mono);font-size:14px;}
.osd-empty{border:1px dashed var(--border-strong);border-radius:var(--radius-md);padding:26px;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;}
.osd-empty h3{margin:2px 0 0;font-size:var(--text-body-m-size);font-weight:600;color:var(--text-primary);}
.osd-empty p{margin:0;font-size:var(--text-body-s-size);line-height:var(--text-body-s-line);color:var(--text-secondary);max-width:420px;}
.osd-kv{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
.osd-mini{border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:13px 15px;display:flex;flex-direction:column;gap:5px;}
.osd-mini__label{font-size:var(--text-label-s-size);font-weight:500;letter-spacing:0.3px;text-transform:uppercase;color:var(--text-tertiary);}
.osd-mini__value{font-size:var(--text-body-m-size);color:var(--text-primary);}
`;
if (typeof document !== 'undefined') {
  const prev = document.getElementById('osd-set-css');
  if (prev) prev.remove();
  const s = document.createElement('style'); s.id = 'osd-set-css'; s.textContent = css; document.head.appendChild(s);
}

function Section({ title, desc, actions, children }) {
  return (
    <section className="osd-sec">
      <div className="osd-sec__bar">
        <span className="osd-sec__meta"><h2>{title}</h2>{desc ? <p>{desc}</p> : null}</span>
        {actions}
      </div>
      <div className="osd-sec__body">{children}</div>
    </section>
  );
}

const Field = ({ label, value, mono, muted }) => (
  <div>
    <div className="osd-fld__label">{label}</div>
    <div className={`osd-fld__value${mono ? ' os-mono' : ''}${muted ? ' osd-fld__value--muted' : ''}`}>{value}</div>
  </div>
);

const TABS = [
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'account', label: 'Account', icon: 'building-2' },
  { id: 'privacy', label: 'Privacy & Identity', icon: 'shield-check' },
  { id: 'billing', label: 'Billing', icon: 'credit-card' },
  { id: 'integrations', label: 'Integrations', icon: 'code-xml' },
  { id: 'rewards', label: 'Rewards', icon: 'gift' },
];

/** Settings — side-nav layout with flat, always-open sections (no accordions). */
export function SettingsScreen({ user = 'Olusegun Aborode', workspace = 'DatumLabs' }) {
  const [tab, setTab] = React.useState('profile');
  return (
    <div className="osd-set" data-screen-label={`Settings · ${tab}`}>
      <div className="osd-set__head"><h1>Settings</h1></div>
      <div className="osd-set__layout">
        <nav className="osd-set__nav" aria-label="Settings sections">
          {TABS.map((t) => (
            <button key={t.id} className={`osd-set__tab${tab === t.id ? ' osd-set__tab--active' : ''}`} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
              <span className="osd-set__ticn"><Icon name={t.icon} size={17} /></span>{t.label}
            </button>
          ))}
        </nav>
        <div className="osd-set__content">
          {tab === 'profile' ? (
            <React.Fragment>
              <Section title="Profile details" desc="Your personal information" actions={<Button variant="secondary" size="s" icon="pencil">Edit</Button>}>
                <div className="osd-grid">
                  <Field label="Full name" value={user} />
                  <Field label="Email" value="aborodeolusegun@gmail.com" mono />
                </div>
              </Section>
              <Section title="Security" desc="Password and sign-in protection" actions={<Button size="s" icon="shield">Set up 2FA</Button>}>
                <div className="osd-grid">
                  <Field label="Two-factor authentication" value={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>Disabled <Badge status="warning">Needs setup</Badge></span>} />
                  <Field label="Password" value="Last changed 3 months ago" muted />
                </div>
              </Section>
            </React.Fragment>
          ) : null}
          {tab === 'account' ? (
            <React.Fragment>
              <Section title="Project" desc="Protocol identity, chains, and billing details" actions={<Button variant="secondary" size="s" icon="pencil">Edit</Button>}>
                <div className="osd-grid">
                  <Field label="Project / protocol name" value={workspace} />
                  <Field label="Token ticker" value="—" muted />
                  <Field label="Primary chains" value="—" muted />
                  <Field label="Billing email" value="—" muted />
                </div>
              </Section>
              <Section title="Contracts" desc="Indexed into the on-chain intelligence pipeline" actions={<Button size="s" icon="plus">Add contract</Button>}>
                <div className="osd-empty">
                  <h3>No contracts yet</h3>
                  <p>Add contract addresses to start indexing holders and activity.</p>
                </div>
              </Section>
              <Section title="Branding" desc="Appearance across emails and pushes" actions={<Button variant="secondary" size="s" icon="pencil">Edit brand kit</Button>}>
                <div className="osd-grid">
                  <Field label="Logo" value="Onchain Suite mark" />
                  <Field label="Accent colour" value={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 16, height: 16, borderRadius: 'var(--radius-sm)', background: 'var(--orange-500)' }}></span>Orange · #FF6828</span>} />
                </div>
              </Section>
              <Section title="Sender verification" desc="Domains, DKIM and SPF for branded sending" actions={<Button variant="secondary" size="s">Verify domain</Button>}>
                <div className="osd-grid">
                  <Field label="Verified domains" value="0 verified" muted />
                  <Field label="DKIM / SPF" value="Not configured" muted />
                </div>
              </Section>
              <Section title="Team" desc="Access and member roles" actions={<Button size="s" icon="plus">Invite member</Button>}>
                <div className="osd-empty">
                  <h3>No team members yet</h3>
                  <p>Invite teammates to collaborate on segments, campaigns, and sending.</p>
                </div>
              </Section>
            </React.Fragment>
          ) : null}
          {tab === 'privacy' ? (
            <React.Fragment>
              <Section title="Zero-knowledge identity" desc="How wallets link to email and socials" actions={<Badge status="success">Active</Badge>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ margin: 0, fontSize: 'var(--text-body-s-size)', lineHeight: 1.55, color: 'var(--text-secondary)' }}>Wallet↔identity links are captured with explicit opt-in and verified with zero-knowledge proofs. You can message a wallet without ever seeing the proof's underlying identity, and the raw link is never exposed to other tools.</p>
                  <div className="osd-grid">
                    <Field label="Verified links" value={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>128,540 <Badge status="success">ZK-verified</Badge></span>} />
                    <Field label="Proof method" value="Groth16 · off-chain link store" mono />
                  </div>
                </div>
              </Section>
              <Section title="Data & retention" desc="GDPR-aligned handling of wallet↔email links" actions={<Button variant="secondary" size="s" icon="pencil">Edit policy</Button>}>
                <div className="osd-grid">
                  <Field label="Link storage" value="Off-chain, encrypted · deletable on request" />
                  <Field label="Retention window" value="Until opt-out" muted />
                  <Field label="Wallet addresses = personal data" value={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>Treated as PII <Badge status="success">Compliant</Badge></span>} />
                  <Field label="Right to erasure" value="Self-serve unsubscribe purges the link" muted />
                </div>
              </Section>
              <Section title="Consent" desc="What wallets agree to when they link" actions={<Button variant="secondary" size="s">View consent copy</Button>}>
                <div className="osd-grid">
                  <Field label="Opt-in required" value="Yes — no link without explicit consent" />
                  <Field label="Channels covered" value="Email, X, Farcaster" />
                </div>
              </Section>
            </React.Fragment>
          ) : null}
          {tab === 'billing' ? (
            <React.Fragment>
              <Section title="Plan & usage" desc="Current plan and monthly usage" actions={<Button size="s" icon="arrow-up-right">Upgrade plan</Button>}>
                <div className="osd-kv">
                  <div className="osd-mini"><span className="osd-mini__label">Status</span><span className="osd-mini__value"><Badge status="success">Free</Badge></span></div>
                  <div className="osd-mini"><span className="osd-mini__label">Billing cycle</span><span className="osd-mini__value">Monthly</span></div>
                  <div className="osd-mini"><span className="osd-mini__label">Next billing</span><span className="osd-mini__value os-mono">12/08/2026</span></div>
                </div>
              </Section>
              <Section title="Invoices" desc="Billing history">
                <div className="osd-grid">
                  <Field label="Latest invoice" value="—" muted />
                  <Field label="Latest amount" value="—" muted />
                </div>
              </Section>
            </React.Fragment>
          ) : null}
          {tab === 'integrations' ? (
            <Section title="In-app push" desc="SDK keys, approved origins, and test delivery" actions={<Button variant="secondary" size="s" icon="key-round">Manage keys</Button>}>
              <div className="osd-kv">
                <div className="osd-mini"><span className="osd-mini__label">Publishable keys</span><span className="osd-mini__value">Configured</span></div>
                <div className="osd-mini"><span className="osd-mini__label">Secret keys</span><span className="osd-mini__value">0 created</span></div>
                <div className="osd-mini"><span className="osd-mini__label">Allowed origins</span><span className="osd-mini__value">0 added</span></div>
              </div>
            </Section>
          ) : null}
          {tab === 'rewards' ? (
            <Section title="Rewards" desc="Coming soon" actions={<Button variant="secondary" size="s">Join waitlist</Button>}>
              <p style={{ margin: 0, fontSize: 'var(--text-body-m-size)', color: 'var(--text-secondary)', maxWidth: 560 }}>
                On-chain rewards for engaged wallets are on the roadmap. Join the waitlist to get early access when the program launches.
              </p>
            </Section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
