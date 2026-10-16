import { useState, type ReactNode } from 'react';
import { Badge, Button, Input } from './ui';
import { Icon } from './icons';
import { toast } from './toast';
import { store, useX } from '../data/store';

/* X connection panel.
 *
 * X has a shape email and push do not: connecting it is the easy half, and the audience is
 * the hard half. Email is reachable the moment DNS resolves; an authorised X app still
 * reaches nobody until a follower links a wallet.
 *
 * So the panel reports two things separately — the connection, and the addressable
 * audience — and does not read as "done" until both are real. Collapsing them into one
 * green tick is how an operator ends up building a campaign for an audience of zero. */

export function XPanel() {
  const x = useX();
  const [handle, setHandle] = useState('');

  if (x.status === 'none') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--text-secondary)', maxWidth: 620 }}>
          Authorise an X app with <b>dm.write</b> to send DMs from your account. X only permits a DM to
          someone who follows you or has DM&apos;d you first (no API tier changes that), so your
          followers are the ceiling on reach, not your segment.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', maxWidth: 460 }}>
          <div style={{ flex: 1 }}>
            <Input label="Account handle" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@acme" mono />
          </div>
          <Button disabled={handle.trim().length < 2} onClick={() => { store.connectX(handle.trim()); toast('X app authorised'); }}>Authorise</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="grid">
        <Field label="Account" value={`@${x.handle}`} mono />
        <Field label="Scope" value={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>dm.write <Badge status="success">Granted</Badge></span>} />
        <Field label="Reachable followers" value={x.reachableFollowers ? x.reachableFollowers.toLocaleString('en-US') : 'None yet'} muted={!x.reachableFollowers} />
      </div>

      {x.status === 'pending' ? (
        <div className="senderwarn" style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
          <Icon name="triangle-alert" size={15} color="var(--orange-600)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12.5, lineHeight: 1.55 }}>
            Authorised, but <b>no follower has linked a wallet yet</b>. Add a &ldquo;Link X&rdquo; field to your
            forms so followers can be matched to the wallets you segment on.
          </span>
        </div>
      ) : (
        <p style={{ margin: 0, display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
          <Icon name="check-circle-2" size={15} color="var(--green-600)" style={{ flexShrink: 0, marginTop: 1 }} />
          {x.reachableFollowers.toLocaleString('en-US')} followers have a linked wallet and can receive a DM.
          Report rate is worth watching more closely than unsubscribes: enough reports revoke DM access entirely.
        </p>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="secondary" size="s" icon="refresh-cw" onClick={() => { store.checkX(); toast(x.checked ? 'Re-synced followers' : 'Authorised. No followers with a linked wallet yet'); }}>Re-sync followers</Button>
        <Button variant="tertiary" size="s" icon="trash-2" onClick={() => { store.removeX(); toast('X app disconnected'); }}>Disconnect</Button>
      </div>
    </div>
  );
}

/** Local mirror of the Settings field row — same markup, so these panels drop into a
 *  Section without importing the screen that owns it. */
function Field({ label, value, mono, muted }: { label: string; value: ReactNode; mono?: boolean; muted?: boolean }) {
  return (
    <div>
      <div className="fld__label">{label}</div>
      <div className={`fld__value${mono ? ' os-mono' : ''}${muted ? ' fld__value--muted' : ''}`}>{value}</div>
    </div>
  );
}
