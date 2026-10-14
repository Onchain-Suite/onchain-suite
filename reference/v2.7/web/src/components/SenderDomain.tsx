import { useState } from 'react';
import { Badge, Button, Input, Modal } from './ui';
import { Icon } from './icons';
import { toast } from './toast';
import { copyText } from '../data/persist';
import { store, useSender } from '../data/store';

/* Sender-domain verification. Branded email can't send until both the DKIM and SPF TXT
   records resolve, so this surface is the gate: publish the records, let the user copy them
   into their registrar, then poll until DNS agrees. Shared by onboarding and Settings. */

export function dnsRecords(domain: string) {
  const host = domain.split('.')[0] || 'mail';
  return [
    { kind: 'DKIM', type: 'TXT', name: `${host}._domainkey.${domain || 'yourdomain.com'}`, value: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC7…' },
    { kind: 'SPF', type: 'TXT', name: domain || 'yourdomain.com', value: 'v=spf1 include:_spf.onchainsuite.xyz ~all' },
  ];
}

/** The three-node progression: add records → we check → verified. */
export function VerifyFlow({ status, dkim, spf }: { status: string; dkim: boolean; spf: boolean }) {
  const steps = [
    { label: 'Add DNS records', done: status !== 'none' },
    { label: 'We check', done: dkim || spf },
    { label: 'Verified', done: status === 'verified' },
  ];
  return (
    <div className="vflow">
      {steps.map((s, i) => (
        <div className="vflow__node" key={s.label}>
          <span className={`vflow__dot${s.done ? ' on' : ''}`}>{s.done ? <Icon name="check" size={12} strokeWidth={3} /> : i + 1}</span>
          <span className={`vflow__lbl${s.done ? ' on' : ''}`}>{s.label}</span>
          {i < steps.length - 1 && <span className="vflow__bar" aria-hidden />}
        </div>
      ))}
    </div>
  );
}

/** Copyable DKIM + SPF table. This is what the user pastes into their DNS provider. */
export function DnsTable({ domain, dkimVerified, spfVerified }: { domain: string; dkimVerified: boolean; spfVerified: boolean }) {
  const rows = dnsRecords(domain);
  const ok = [dkimVerified, spfVerified];
  return (
    <div className="dns">
      <div className="dns__head"><span>Record</span><span>Type</span><span>Name</span><span>Value</span><span /></div>
      {rows.map((r, i) => (
        <div className="dns__row" key={r.kind}>
          <span className="dns__kind">{r.kind}{ok[i] ? <Icon name="check-circle-2" size={13} color="var(--green-500)" /> : null}</span>
          <span className="dns__type">{r.type}</span>
          <span className="dns__val" title={r.name}>{r.name}</span>
          <span className="dns__val" title={r.value}>{r.value}</span>
          <button type="button" className="dns__copy" aria-label={`Copy ${r.kind} value`}
            onClick={async () => toast(await copyText(r.value) ? `${r.kind} value copied` : 'Copy failed. Select the value manually')}>
            <Icon name="copy" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Full panel: input → records → check. Used inline in onboarding and in the Settings modal. */
export function SenderDomainPanel({ compact }: { compact?: boolean }) {
  const sender = useSender();
  const [draft, setDraft] = useState(sender.domain);
  const [checking, setChecking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const valid = /.+\..+/.test(draft.trim());
  const remove = () => { store.removeDomain(); setDraft(''); setConfirming(false); toast('Domain removed. Branded email can no longer send'); };

  const check = () => {
    setChecking(true);
    setTimeout(() => {
      store.checkDomain();
      setChecking(false);
      const s = store.getState().sender;
      toast(s.status === 'verified' ? `${s.domain} verified. Branded sending is on` : 'DKIM found. SPF not resolving yet. Check again shortly.', s.status === 'verified' ? 'check-circle-2' : 'info');
    }, 1200);
  };

  if (sender.status === 'none') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <VerifyFlow status="none" dkim={false} spf={false} />
        <Input label="Sending domain" mono value={draft} placeholder="mail.acme.com"
          onChange={(e) => setDraft(e.target.value)}
          helper={draft && !valid ? 'Enter a domain like mail.acme.com.' : 'Use a subdomain you control. Sending from it keeps your root domain’s reputation separate.'} />
        <div><Button disabled={!valid} onClick={() => { store.startDomainVerification(draft.trim()); toast('DNS records generated. Add them at your registrar'); }}>Generate DNS records</Button></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-primary)' }}>{sender.domain}</span>
        {sender.status === 'verified'
          ? <Badge status="success">Verified</Badge>
          : <Badge status="warning">Pending DNS</Badge>}
      </div>
      <VerifyFlow status={sender.status} dkim={sender.dkimVerified} spf={sender.spfVerified} />
      {sender.status !== 'verified' && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Add these two TXT records at your DNS provider. Propagation usually takes a few minutes; branded email stays blocked until both resolve.
        </p>
      )}
      <DnsTable domain={sender.domain} dkimVerified={sender.dkimVerified} spfVerified={sender.spfVerified} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {sender.status !== 'verified' && (
          <Button size={compact ? 's' : 'm'} icon="refresh-cw" disabled={checking} onClick={check}>{checking ? 'Checking DNS…' : 'Check records'}</Button>
        )}
        {/* Removing a verified domain re-blocks every email campaign, so it asks first.
            An unverified one has nothing to lose — remove it straight away. */}
        <Button variant="tertiary" size={compact ? 's' : 'm'} icon="trash-2"
          onClick={() => (sender.status === 'verified' ? setConfirming(true) : remove())}>Remove domain</Button>
      </div>
      {confirming && (
        <Modal title="Remove this sending domain?" onClose={() => setConfirming(false)}
          footer={<><Button variant="secondary" onClick={() => setConfirming(false)}>Keep it</Button><Button variant="danger" icon="trash-2" onClick={remove}>Remove domain</Button></>}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
            <b style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{sender.domain}</b> is verified and
            in use. Removing it blocks every email campaign immediately (scheduled sends included) until another domain
            is verified. Your DNS records stay where they are, so re-adding the same domain verifies again quickly.
          </p>
        </Modal>
      )}
    </div>
  );
}
