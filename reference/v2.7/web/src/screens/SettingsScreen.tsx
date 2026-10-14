import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Input, Modal, Select } from '../components/ui';
import { Icon, type IconName } from '../components/icons';
import { clearPersisted } from '../data/persist';
import { SenderDomainPanel } from '../components/SenderDomain';
import { BillingSections } from './Billing';
import { store, useFrequency, useHoldout, useSender } from '../data/store';
import { SINGLE_CAMPAIGN_FLOOR, requiredN } from '../data/experiment';
import { Switch } from '../components/ui';
import './settings.css';
import { ACCENT_SWATCHES } from '../data/brand';
import { enterEmptyWorkspace, enterLiveWorkspace, useWorkspaceMode } from '../data/workspace';
import { startTour } from '../data/tour';

const TABS: { id: string; label: string; icon: IconName }[] = [
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'account', label: 'Account', icon: 'building-2' },
  { id: 'privacy', label: 'Privacy & identity', icon: 'shield-check' },
  { id: 'billing', label: 'Billing', icon: 'credit-card' },
  { id: 'rewards', label: 'Rewards', icon: 'gift' },
];

function Section({ title, desc, actions, children }: { title: string; desc?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="sec">
      <div className="sec__bar">
        <span className="sec__meta"><h2>{title}</h2>{desc && <p>{desc}</p>}</span>
        {actions}
      </div>
      <div className="sec__body">{children}</div>
    </section>
  );
}
function Field({ label, value, mono, muted }: { label: string; value: ReactNode; mono?: boolean; muted?: boolean }) {
  return (
    <div>
      <div className="fld__label">{label}</div>
      <div className={`fld__value${mono ? ' os-mono' : ''}${muted ? ' fld__value--muted' : ''}`}>{value}</div>
    </div>
  );
}

type Dialog =
  | { kind: '2fa' } | { kind: 'invite' } | { kind: 'upgrade' }
  | { kind: 'keys' } | { kind: 'consent' } | null;

/* Message frequency (2.5).
 *
 * Deliberately one budget across every channel rather than a limit per channel. Four
 * channels each obeying their own sensible cap still adds up to four messages in an
 * afternoon, and the recipient does not experience four channels — they experience you,
 * four times. Counting the person rather than the pipe is the whole point. */
function FrequencySection() {
  const f = useFrequency();
  return (
    <Section title="Message frequency" desc="One budget across every channel: email, push and X together"
      actions={<Badge status={f.enabled ? 'success' : 'neutral'}>{f.enabled ? 'Enforced' : 'Off'}</Badge>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Switch checked={f.enabled} onChange={(v) => store.setFrequency({ enabled: v })} label="Enforce a frequency budget" />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <b style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Enforce a frequency budget</b>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Applies to every campaign and Loop. Contacts over budget are skipped, not queued.</span>
          </span>
        </div>
        {f.enabled && (
          <>
            <div className="grid">
              <Select label="Messages per contact · 7 days" value={String(f.maxPerWeek)}
                onChange={(e) => store.setFrequency({ maxPerWeek: Number(e.target.value) })}
                options={[1, 2, 3, 4, 5, 7, 10].map((n) => ({ value: String(n), label: `${n} message${n === 1 ? '' : 's'}` }))} />
              <Select label="Minimum gap between messages" value={String(f.minHoursBetween)}
                onChange={(e) => store.setFrequency({ minHoursBetween: Number(e.target.value) })}
                options={[2, 6, 10, 24, 48].map((n) => ({ value: String(n), label: `${n} hours` }))} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Switch checked={f.exemptTransactional} onChange={(v) => store.setFrequency({ exemptTransactional: v })} label="Exempt transactional messages" />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <b style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Exempt transactional messages</b>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Receipts, security alerts and 2FA always send. Turning this off can suppress a security alert. Leave it on.</span>
              </span>
            </div>
            <p style={{ margin: 0, display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)', padding: '11px 13px' }}>
              <Icon name="info" size={14} color="var(--action-primary)" style={{ flexShrink: 0, marginTop: 1 }} />
              A contact who has already had {f.maxPerWeek} message{f.maxPerWeek === 1 ? '' : 's'} this week is skipped by every campaign until the window rolls, even a different channel, even a different campaign. Campaign estimates show the skipped count before you send.
            </p>
          </>
        )}
      </div>
    </Section>
  );
}

/* Holdout policy (2.7).
 *
 * Two controls that answer two different questions, which is the thing people get wrong
 * about holdouts. The per-campaign slice asks "did this message work". The programme slice
 * asks "is any of this worth doing", and it is the only one that can answer anything at a
 * few thousand recipients, because it pools every campaign instead of restarting each send. */
function HoldoutSection() {
  const h = useHoldout();
  return (
    <Section title="Holdout &amp; measurement" desc="Withhold a random slice so campaigns can be compared against not sending"
      actions={<Badge status={h.globalEnabled ? 'success' : 'neutral'}>{h.globalEnabled ? 'Both active' : 'Per-campaign only'}</Badge>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="grid">
          <Select label="Per-campaign holdout" value={String(h.campaignPct)}
            onChange={(e) => store.setHoldout({ campaignPct: Number(e.target.value) })}
            options={[0, 5, 10, 15, 20].map((n) => ({ value: String(n), label: n === 0 ? 'Off' : `${n}% of each audience` }))}
            helper={h.campaignPct === 0
              ? 'No control group. Campaign reports will show conversion but never lift.'
              : `Needs about ${requiredN(0.15, 3, h.campaignPct).toLocaleString('en-US')} recipients to resolve a 3pt lift.`} />
          <Select label="Programme holdout" value={h.globalEnabled ? String(h.globalPct) : '0'}
            onChange={(e) => { const v = Number(e.target.value); store.setHoldout({ globalEnabled: v > 0, globalPct: v > 0 ? v : h.globalPct }); }}
            options={[0, 2, 5, 10].map((n) => ({ value: String(n), label: n === 0 ? 'Off' : `${n}% of everyone` }))}
            helper="Held back from every campaign and Loop, so lift accumulates across all of them." />
        </div>

        <p style={{ margin: 0, display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-secondary)', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <Icon name="flask-conical" size={14} color="var(--action-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            Below roughly <b>{SINGLE_CAMPAIGN_FLOOR.toLocaleString('en-US')}</b> recipients no single campaign can settle
            its own result. The control arm is too small whatever percentage you pick. That is not a reason to skip
            the holdout; it is the reason the programme holdout exists. Campaign reports say which case they are in
            rather than printing a number that looks like an answer.
          </span>
        </p>

        {h.globalEnabled && (
          <div className="grid">
            <Field label="Programme control group" value={`${h.globalPct}% of all contacts`} />
            <Field label="Rotated" value={`${h.rotatedAt} · quarterly`} muted />
          </div>
        )}
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: 'var(--text-tertiary)' }}>
          Assignment is deterministic, so the same wallets stay in the control group every time a campaign is
          recomputed. The programme slice rotates quarterly so the same people are not permanently unmessaged.
        </p>
      </div>
    </Section>
  );
}

/** Settings — side-nav layout with flat, always-open sections (no accordions).
    Privacy & Identity is the compliance home for the ZK wallet↔identity system.
    Every action is wired: sections toggle into an edit mode that saves, and the
    remaining actions open real dialogs that mutate state. */
export default function SettingsScreen({ user = 'Ada Okafor', workspace = 'Acme' }: { user?: string; workspace?: string }) {
  const nav = useNavigate();
  /* Wipes every list, tag, form, segment, published link and setting in one click with no way
     back. The domain-removal flow opens a confirm for something trivially reversible; this
     had none. */
  const [resetting, setResetting] = useState(false);
  const wsMode = useWorkspaceMode();
  const [switching, setSwitching] = useState(false);
  const [tab, setTab] = useState('profile');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  // Mutable settings state — what the Edit flows actually change.
  const [profile, setProfile] = useState({ name: user, email: 'ada@example.com' });
  const [project, setProject] = useState({ name: workspace, ticker: '', chains: '', billing: '' });
  const [brand, setBrand] = useState({ logo: 'OnchainSuite mark', accent: '#FF6828' });
  const [retention, setRetention] = useState('Until opt-out');
  const [team, setTeam] = useState<{ email: string; role: string }[]>([]);
  const sender = useSender();
  const [twoFa, setTwoFa] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);

  const editBtn = (id: string) => <Button variant="secondary" size="s" icon="pencil" onClick={() => setEditing(editing === id ? null : id)}>{editing === id ? 'Cancel' : 'Edit'}</Button>;
  const saveRow = (onSave: () => void) => (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
      <Button variant="secondary" size="s" onClick={() => setEditing(null)}>Cancel</Button>
      <Button size="s" icon="check" onClick={() => { onSave(); setEditing(null); flash('Changes saved'); }}>Save changes</Button>
    </div>
  );
  return (
    <div className="page page--wide"><div className="set">
      <div className="set__head"><h1>Settings</h1></div>
      <div className="set__layout">
        <nav className="set__nav" aria-label="Settings sections">
          {TABS.map((t) => (
            <button key={t.id} type="button" className={`set__tab${tab === t.id ? ' set__tab--active' : ''}`} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
              <span className="set__ticn"><Icon name={t.icon} size={17} /></span>{t.label}
            </button>
          ))}
        </nav>

        <div className="set__content">
          {tab === 'profile' && (
            <>
              <Section title="Profile details" desc="Your personal information" actions={editBtn('profile')}>
                {editing === 'profile' ? (
                  <>
                    <div className="grid">
                      <Input label="Full name" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
                      <Input label="Email" mono value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
                    </div>
                    {saveRow(() => {})}
                  </>
                ) : (
                  <div className="grid">
                    <Field label="Full name" value={profile.name} />
                    <Field label="Email" value={profile.email} mono />
                  </div>
                )}
              </Section>
              <Section title="Security" desc="Password and sign-in protection"
                actions={twoFa ? <Button variant="secondary" size="s" onClick={() => { setTwoFa(false); flash('Two-factor authentication turned off'); }}>Turn off</Button> : <Button size="s" icon="shield" onClick={() => setDialog({ kind: '2fa' })}>Set up 2FA</Button>}>
                <div className="grid">
                  <Field label="Two-factor authentication" value={twoFa
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>Enabled <Badge status="success">Protected</Badge></span>
                    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>Disabled <Badge status="warning">Needs setup</Badge></span>} />
                  <Field label="Password" value="Last changed 3 months ago" muted />
                </div>
              </Section>
            </>
          )}

          {tab === 'account' && (
            <>
              <Section title="Project" desc="Protocol identity, chains and billing details" actions={editBtn('project')}>
                {editing === 'project' ? (
                  <>
                    <div className="grid">
                      <Input label="Project / protocol name" value={project.name} onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))} />
                      <Input label="Token ticker" value={project.ticker} placeholder="$VAULT" onChange={(e) => setProject((p) => ({ ...p, ticker: e.target.value }))} />
                      <Input label="Primary chains" value={project.chains} placeholder="Base, Ethereum" onChange={(e) => setProject((p) => ({ ...p, chains: e.target.value }))} />
                      <Input label="Billing email" value={project.billing} placeholder="billing@acme.com" onChange={(e) => setProject((p) => ({ ...p, billing: e.target.value }))} />
                    </div>
                    {saveRow(() => {})}
                  </>
                ) : (
                  <div className="grid">
                    <Field label="Project / protocol name" value={project.name} />
                    <Field label="Token ticker" value={project.ticker || 'Not set'} muted={!project.ticker} />
                    <Field label="Primary chains" value={project.chains || 'Not set'} muted={!project.chains} />
                    <Field label="Billing email" value={project.billing || 'Not set'} muted={!project.billing} />
                  </div>
                )}
              </Section>
              <Section title="Branding" desc="Appearance across emails and pushes" actions={editBtn('brand')}>
                {editing === 'brand' ? (
                  <>
                    <div className="grid">
                      <Input label="Logo" value={brand.logo} onChange={(e) => setBrand((b) => ({ ...b, logo: e.target.value }))} />
                      <div className="field">
                        <span className="field__label">Accent colour</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {ACCENT_SWATCHES.map((c) => (
                            <button key={c} type="button" aria-label={`Accent ${c}`} onClick={() => setBrand((b) => ({ ...b, accent: c }))}
                              style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: c, border: brand.accent === c ? '2px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer' }} />
                          ))}
                        </div>
                      </div>
                    </div>
                    {saveRow(() => {})}
                  </>
                ) : (
                  <div className="grid">
                    <Field label="Logo" value={brand.logo} />
                    <Field label="Accent colour" value={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 16, height: 16, borderRadius: 'var(--radius-sm)', background: brand.accent }} />{brand.accent}</span>} />
                  </div>
                )}
              </Section>
              <Section title="Sender verification" desc="Domains, DKIM and SPF for branded sending"
                actions={sender.status === 'verified' ? <Badge status="success">Verified</Badge> : sender.status === 'pending' ? <Badge status="warning">Pending DNS</Badge> : null}>
                <SenderDomainPanel compact />
              </Section>
              {/* The flow lives at its own address, so this is a link to it rather than a
                  control that flips the setup flag: /onboarding survives a reload and can be
                  opened directly, and nothing about the workspace changes either way. */}
              <Section title="Onboarding" desc="Walk through first-run setup again"
                actions={<Button variant="secondary" size="s" icon="play" onClick={() => nav('/onboarding')}>Replay onboarding</Button>}>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 560 }}>
                  Opens the first-run flow at <code>/onboarding</code>. Your contracts, lists and settings
                  stay exactly as they are.
                </p>
              </Section>
              {/* Both states of a new workspace have to be showable on demand: the empty one a
                  customer meets a minute after paying, and the same workspace in use. */}
              <Section title="Workspace state" desc={wsMode === 'empty'
                ? 'Empty: as a customer sees it right after paying'
                : 'In use: the demo workspace with data in it'}
                actions={<>
                  <Button variant="secondary" size="s" icon="brain" onClick={() => { startTour(); nav('/home'); }}>Take the tour</Button>
                  <Button variant="secondary" size="s" icon="refresh-cw" onClick={() => setSwitching(true)}>
                    {wsMode === 'empty' ? 'Show in use' : 'Show empty'}
                  </Button>
                </>}>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 560 }}>
                  Empty is a workspace with nothing indexed: every section says what fills it, and
                  Cerebra walks through each one. Indexing a contract in Integrations moves it to in use.
                </p>
              </Section>
              <Section title="Demo data" desc="Reset everything created in this session"
                actions={<Button variant="secondary" size="s" icon="rotate-ccw" onClick={() => setResetting(true)}>Reset demo data</Button>}>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 560 }}>
                  Lists, tags, forms, segments and settings you create are saved in this browser so they survive a reload. Resetting clears them and restores the seeded demo state.
                </p>
              </Section>
              <FrequencySection />
              <HoldoutSection />
              <Section title="Team" desc="Access and member roles" actions={<Button size="s" icon="plus" onClick={() => setDialog({ kind: 'invite' })}>Invite member</Button>}>
                {team.length ? (
                  <div className="grid">{team.map((m) => <Field key={m.email} label={m.role} value={m.email} mono />)}</div>
                ) : (
                  <div className="empty"><h3>No team members yet</h3><p>Invite teammates to collaborate on segments, campaigns and sending.</p></div>
                )}
              </Section>
            </>
          )}

          {tab === 'privacy' && (
            <>
              <Section title="Zero-knowledge identity" desc="How wallets link to email and socials" actions={<Badge status="success">Active</Badge>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--text-secondary)' }}>Wallet↔identity links are captured with explicit opt-in and verified with zero-knowledge proofs. You can message a wallet without ever seeing the proof&apos;s underlying identity, and the raw link is never exposed to other tools.</p>
                  <div className="grid">
                    <Field label="Verified links" value={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>128,540 <Badge status="success">ZK-verified</Badge></span>} />
                    <Field label="Proof method" value="Groth16 · off-chain link store" mono />
                  </div>
                </div>
              </Section>
              <Section title="Data & retention" desc="GDPR-aligned handling of wallet↔email links" actions={editBtn('retention')}>
                {editing === 'retention' && (
                  <div style={{ marginBottom: 16 }}>
                    <Select label="Retention window" options={['Until opt-out', '12 months', '24 months', '36 months'].map((v) => ({ value: v, label: v }))} value={retention} onChange={(e) => setRetention(e.target.value)} />
                    {saveRow(() => {})}
                  </div>
                )}
                <div className="grid">
                  <Field label="Link storage" value="Off-chain, encrypted · deletable on request" />
                  <Field label="Retention window" value={retention} muted={retention === 'Until opt-out'} />
                  <Field label="Wallet addresses = personal data" value={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>Treated as PII <Badge status="success">Compliant</Badge></span>} />
                  <Field label="Right to erasure" value="Self-serve unsubscribe purges the link" muted />
                </div>
              </Section>
              <Section title="Consent" desc="What wallets agree to when they link" actions={<Button variant="secondary" size="s" onClick={() => setDialog({ kind: 'consent' })}>View consent copy</Button>}>
                <div className="grid">
                  <Field label="Opt-in required" value="Yes. No link without explicit consent" />
                  <Field label="Channels covered" value="Email, X" />
                </div>
              </Section>
            </>
          )}

          {tab === 'billing' && <BillingSections />}

          {tab === 'rewards' && (
            <Section title="Rewards" desc="Coming soon" actions={waitlisted ? <Badge status="success">On the waitlist</Badge> : <Button variant="secondary" size="s" onClick={() => { setWaitlisted(true); flash('Added to the rewards waitlist'); }}>Join waitlist</Button>}>
              <p style={{ margin: 0, fontSize: 15, color: 'var(--text-secondary)', maxWidth: 560 }}>
                On-chain rewards for engaged wallets are on the roadmap. Join the waitlist to get early access when the program launches.
              </p>
            </Section>
          )}
        </div>
      </div>

      {dialog?.kind === '2fa' && <TwoFa onClose={() => setDialog(null)} onDone={() => { setTwoFa(true); setDialog(null); flash('Two-factor authentication enabled'); }} />}
      {dialog?.kind === 'invite' && <InviteMember onClose={() => setDialog(null)} onAdd={(m) => { setTeam((v) => [...v, m]); setDialog(null); flash(`Invite sent to ${m.email}`); }} />}
      {dialog?.kind === 'keys' && (
        <Modal title="SDK keys" onClose={() => setDialog(null)} footer={<Button onClick={() => setDialog(null)}>Done</Button>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Publishable key" value="pk_live_9f2a41cd7b" mono />
            <Field label="Secret key" value="Never shown after creation. Roll to issue a new one" muted />
            <Button variant="secondary" size="s" icon="key-round" onClick={() => flash('New secret key issued')}>Roll secret key</Button>
          </div>
        </Modal>
      )}
      {dialog?.kind === 'consent' && (
        <Modal title="Consent copy" onClose={() => setDialog(null)} footer={<Button onClick={() => setDialog(null)}>Close</Button>}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            “I agree to receive updates and consent to linking my wallet to my contact details. The link is verified with a zero-knowledge proof, stored encrypted off-chain, and never shared. I can unsubscribe at any time, which permanently deletes the link.”
          </p>
        </Modal>
      )}
      {toast && (
        <div role="status" aria-live="polite" style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 500, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 'var(--radius-md)', background: 'var(--bg-raised)', border: '1px solid var(--border-default)', boxShadow: 'var(--elevation-3)', fontSize: 14, color: 'var(--text-primary)' }}>
          <Icon name="check-circle-2" size={18} color="var(--green-500)" />{toast}
        </div>
      )}
    </div>

      {switching && (
        <Modal title={wsMode === 'empty' ? 'Show the workspace in use?' : 'Show an empty workspace?'}
          onClose={() => setSwitching(false)}
          footer={<><Button variant="secondary" onClick={() => setSwitching(false)}>Cancel</Button>
            <Button onClick={() => {
              if (wsMode === 'empty') enterLiveWorkspace(); else enterEmptyWorkspace();
              setSwitching(false);
              nav('/home');
            }}>{wsMode === 'empty' ? 'Show in use' : 'Show empty'}</Button></>}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            {wsMode === 'empty'
              ? 'This brings back the demo workspace with its contracts, lists and channels. Anything you created while it was empty is not kept.'
              : 'This clears contracts, lists, tags, segments, forms and channel setup in this browser, as if you had just paid, and starts Cerebra’s tour. Switch back any time. The demo data returns, but anything you created is not kept.'}
          </p>
        </Modal>
      )}

      {resetting && (
        <Modal title="Reset demo data?" onClose={() => setResetting(false)}
          footer={<><Button variant="secondary" onClick={() => setResetting(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { clearPersisted(); window.location.reload(); }}>Reset everything</Button></>}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            This deletes every list, tag, form, segment, published dashboard link and setting you have
            created in this browser, and restores the seeded demo state. It cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

function TwoFa({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [code, setCode] = useState('');
  return (
    <Modal title="Set up two-factor authentication" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={code.trim().length < 6} onClick={onDone}>Enable 2FA</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>Scan this key in your authenticator app, then enter the 6-digit code it shows.</p>
        <Field label="Setup key" value="JBSW Y3DP EHPK 3PXP" mono />
        <Input label="6-digit code" mono value={code} placeholder="123456" onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} helper={code && code.length < 6 ? 'Code must be 6 digits.' : undefined} />
      </div>
    </Modal>
  );
}
function InviteMember({ onClose, onAdd }: { onClose: () => void; onAdd: (m: { email: string; role: string }) => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Editor');
  const valid = /.+@.+\..+/.test(email);
  return (
    <Modal title="Invite member" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!valid} onClick={() => onAdd({ email: email.trim(), role })}>Send invite</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Email address" mono value={email} placeholder="teammate@acme.com" onChange={(e) => setEmail(e.target.value)}
          helper={email && !valid ? 'Enter a valid email address.' : undefined} />
        <Select label="Role" options={['Admin', 'Editor', 'Viewer'].map((v) => ({ value: v, label: v }))} value={role} onChange={(e) => setRole(e.target.value)} />
      </div>
    </Modal>
  );
}
