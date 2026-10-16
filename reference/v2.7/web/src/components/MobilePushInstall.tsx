import { useState } from 'react';
import { Badge, Button, Input } from './ui';
import { Icon } from './icons';
import { toast } from './toast';
import { store, useMobileInstall } from '../data/store';
import { PUBLISHABLE_KEY, InstallFlow, Snippet } from './PushInstall';

/* Mobile push install — the third setup gate, alongside sender DNS and the web SDK.
 *
 * It is not the web flow with a different snippet. Three things differ, and each changes
 * the shape of the gate:
 *   1. The OS delivers, so we need a signing credential per store (APNs / FCM).
 *   2. You can ship one platform without the other, so it's "at least one", not "both".
 *   3. The user must *grant permission*. A device token only exists afterwards — which is
 *      why credentials alone never mean ready, and why mobile reach is always a subset
 *      of installs in a way web in-app messaging never is. */

export function mobileSnippet(bundleId: string) {
  const id = bundleId || 'com.yourdapp.app';
  return {
    swift: `import OnchainSuite

OnchainSuite.start(key: "${PUBLISHABLE_KEY}", bundleId: "${id}")

// Ask only when the value is obvious. A cold prompt is the
// single biggest cause of permanently lost mobile reach.
OnchainSuite.requestNotificationPermission { granted in
    guard granted else { return }
    OnchainSuite.identify(wallet: address)   // wallet only
}`,
    kotlin: `OnchainSuite.start(context, key = "${PUBLISHABLE_KEY}", bundleId = "${id}")

// Android 13+ requires the runtime prompt too.
OnchainSuite.requestNotificationPermission { granted ->
    if (granted) OnchainSuite.identify(wallet = address)
}`,
  };
}

/** Credential + device-token state, laid out like the web SDK's signal table. */
function MobileSignals({ apns, fcm, tokenSeen }: { apns: boolean; fcm: boolean; tokenSeen: boolean }) {
  const anyCred = apns || fcm;
  const rows = [
    {
      kind: 'Credential', ok: anyCred,
      what: anyCred ? [apns && 'APNs', fcm && 'FCM'].filter(Boolean).join(' + ') + ' accepted' : 'Waiting…',
      why: 'Lets us hand the message to Apple or Google.',
    },
    {
      kind: 'Device', ok: tokenSeen,
      what: tokenSeen ? 'A device registered a token' : 'Waiting…',
      why: 'Only exists after a user grants notification permission.',
    },
  ];
  return (
    <div className="sig">
      <div className="sig__head"><span>Signal</span><span>What we saw</span><span>Why it matters</span></div>
      {rows.map((r) => (
        <div className="sig__row" key={r.kind}>
          <span className="sig__kind">
            {r.kind}
            {r.ok
              ? <Icon name="check-circle-2" size={13} color="var(--green-500)" />
              : <Icon name="clock" size={13} color="var(--text-tertiary)" />}
          </span>
          <span className="sig__what">{r.what}</span>
          <span className="sig__why">{r.why}</span>
        </div>
      ))}
    </div>
  );
}

/** One store credential — upload toggles to accepted, since either alone can ship. */
function CredentialRow({ id, name, file, on }: { id: 'apns' | 'fcm'; name: string; file: string; on: boolean }) {
  return (
    <div className="cred">
      <span className="cred__meta">
        <b>{name}</b>
        <span>{on ? 'Accepted' : `Upload your ${file}`}</span>
      </span>
      {on
        ? (
          <span className="cred__act">
            <Badge status="success">Live</Badge>
            <Button variant="tertiary" size="s" onClick={() => { store.setMobileCredential(id, false); toast(`${name} credential removed`); }}>Remove</Button>
          </span>
        )
        : <Button variant="secondary" size="s" icon="arrow-up-right" onClick={() => { store.setMobileCredential(id, true); toast(`${name} credential accepted`); }}>Upload</Button>}
    </div>
  );
}

/** Full panel: bundle id → credentials + SDK → device token. */
export function MobilePushInstallPanel({ compact }: { compact?: boolean }) {
  const m = useMobileInstall();
  const [draft, setDraft] = useState(m.bundleId);
  const [checking, setChecking] = useState(false);
  const valid = /^[a-z0-9]+(\.[a-z0-9-]+){1,}$/i.test(draft.trim());
  const snip = mobileSnippet(m.bundleId);
  const anyCred = m.apns || m.fcm;

  const check = () => {
    setChecking(true);
    setTimeout(() => {
      store.checkMobileInstall();
      setChecking(false);
      const next = store.getState().mobile;
      toast(
        next.status === 'connected'
          ? `${next.bundleId} connected. Mobile push is on`
          : 'No device has registered yet. Launch the app and accept the notification prompt.',
        next.status === 'connected' ? 'check-circle-2' : 'info',
      );
    }, 1200);
  };

  if (m.status === 'none') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <InstallFlow status="none" sdk={false} wallet={false} labels={['Add your app', 'Credentials & SDK', 'Connected']} />
        <Input label="Bundle identifier" mono value={draft} placeholder="com.acme.app"
          onChange={(e) => setDraft(e.target.value)}
          helper={draft && !valid ? 'Enter an identifier like com.acme.app.' : 'Must match the app you ship to the App Store and Play Store. The OS rejects a token signed for anything else.'} />
        <div><Button disabled={!valid} onClick={() => { store.startMobileInstall(draft.trim()); toast('App registered. Add your store credentials next'); }}>Register app</Button></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-primary)' }}>{m.bundleId}</span>
        {m.status === 'connected'
          ? <Badge status="success">Connected</Badge>
          : <Badge status="warning">{anyCred ? 'Awaiting device' : 'Needs credentials'}</Badge>}
      </div>
      <InstallFlow status={m.status} sdk={anyCred} wallet={m.tokenSeen} labels={['Add your app', 'Credentials & SDK', 'Connected']} />

      <div className="creds">
        <CredentialRow id="apns" name="Apple (APNs)" file=".p8 key, key ID and team ID" on={m.apns} />
        <CredentialRow id="fcm" name="Google (FCM)" file="service account JSON" on={m.fcm} />
      </div>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        One credential is enough to ship that platform. Add Apple only if you ship iOS only.
        {!anyCred && ' Nothing can register a device token until at least one is live.'}
      </p>

      {m.status !== 'connected' && (
        <>
          <Snippet label="iOS · Swift" code={snip.swift} />
          <Snippet label="Android · Kotlin" code={snip.kotlin} />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <Icon name="info" size={13} color="var(--action-primary)" style={{ verticalAlign: -2, marginRight: 5 }} />
            Unlike web, a declined prompt is close to permanent. The user must re-enable notifications in system settings. Ask in context, not on first launch.
          </p>
        </>
      )}

      <MobileSignals apns={m.apns} fcm={m.fcm} tokenSeen={m.tokenSeen} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {m.status !== 'connected' && (
          <Button size={compact ? 's' : 'm'} icon="refresh-cw" disabled={checking || !anyCred} title={!anyCred ? 'Add a store credential first' : undefined}
            onClick={check}>{checking ? 'Listening…' : 'Check for devices'}</Button>
        )}
        <Button variant="tertiary" size={compact ? 's' : 'm'} icon="trash-2" onClick={() => { store.removeMobileInstall(); setDraft(''); toast('App removed'); }}>Remove app</Button>
      </div>
    </div>
  );
}
