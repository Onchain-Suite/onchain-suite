import { useState } from 'react';
import { Badge, Button, Input } from './ui';
import { Icon } from './icons';
import { toast } from './toast';
import { copyText } from '../data/persist';
import { store, usePushInstall } from '../data/store';

/* In-app push install verification — the push counterpart to sender-domain DNS.
 *
 * Email can't send until DKIM and SPF resolve. Push has the same problem in a different
 * shape: a campaign enqueued for wallets that no SDK will ever ask about is silently
 * delivered to nobody. So push gets the same gate, on the two signals that actually
 * matter — the script is live on an allowlisted origin, and it has reported a real
 * connected wallet. The second is the one people forget: a loaded SDK that never
 * identifies a wallet has no queue to drain into. */

export const PUBLISHABLE_KEY = 'pk_live_9f2a41cd7b';

export function installSnippet(origin: string) {
  const host = origin || 'app.yourdapp.com';
  return {
    html: `<script src="https://cdn.onchainsuite.xyz/sdk/v1.js"
  data-key="${PUBLISHABLE_KEY}"
  data-origin="${host}" async></script>`,
    npm: `npm i @onchainsuite/web`,
    init: `import { OnchainSuite } from '@onchainsuite/web';

const os = OnchainSuite.init({ key: '${PUBLISHABLE_KEY}' });

// Tell us which wallet is connected. Until this fires there is
// nobody to enqueue for, and queued pushes cannot be delivered.
os.identify({ wallet: address });

// Wallet addresses only. identify() rejects email, phone and other
// personal identifiers. Sending one would hand you the wallet↔identity
// mapping your subscribers were promised you cannot see.
os.identify({ wallet: address, email });  // ✗ throws IdentifyRejected`,
  };
}

/** The three-node progression: install snippet → we listen → connected.
 *  `labels` lets mobile reuse the same widget with its own wording. */
export function InstallFlow({ status, sdk, wallet, labels }: { status: string; sdk: boolean; wallet: boolean; labels?: [string, string, string] }) {
  const [a, b, c] = labels ?? ['Install the SDK', 'We listen', 'Connected'];
  const steps = [
    { label: a, done: status !== 'none' },
    { label: b, done: sdk || wallet },
    { label: c, done: status === 'connected' },
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

/** A copyable code block. This is what the user pastes into their dApp. */
export function Snippet({ label, code, note }: { label: string; code: string; note?: string }) {
  return (
    <div className="snip">
      <div className="snip__bar">
        <span className="snip__lbl">{label}</span>
        <button type="button" className="snip__copy" aria-label={`Copy ${label}`}
          onClick={async () => toast(await copyText(code) ? `${label} copied` : 'Copy failed. Select the code manually')}>
          <Icon name="copy" size={14} />
        </button>
      </div>
      <pre className="snip__code">{code}</pre>
      {note && <p className="snip__note">{note}</p>}
    </div>
  );
}

/** The two handshakes, shown the way the DNS table shows DKIM and SPF. */
export function SignalTable({ sdk, wallet }: { sdk: boolean; wallet: boolean }) {
  const rows = [
    { kind: 'Script', ok: sdk, what: 'SDK loaded and authenticated', why: 'Confirms the snippet is live on your origin.' },
    { kind: 'Wallet', ok: wallet, what: 'A connected wallet reported', why: 'Confirms pushes have somewhere to land.' },
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
          <span className="sig__what">{r.ok ? r.what : 'Waiting…'}</span>
          <span className="sig__why">{r.why}</span>
        </div>
      ))}
    </div>
  );
}

/** Full panel: origin → snippet → listen. Used in onboarding and in Settings. */
export function PushInstallPanel({ compact }: { compact?: boolean }) {
  const push = usePushInstall();
  const [draft, setDraft] = useState(push.origin);
  const [checking, setChecking] = useState(false);
  const valid = /.+\..+/.test(draft.trim());
  const snip = installSnippet(push.origin);

  const check = () => {
    setChecking(true);
    setTimeout(() => {
      store.checkPushInstall();
      setChecking(false);
      const p = store.getState().push;
      toast(
        p.status === 'connected'
          ? `${p.origin} connected. In-app push is on`
          : 'SDK is live. No wallet has connected yet. Open your dApp and connect one.',
        p.status === 'connected' ? 'check-circle-2' : 'info',
      );
    }, 1200);
  };

  if (push.status === 'none') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <InstallFlow status="none" sdk={false} wallet={false} />
        <Input label="dApp origin" mono value={draft} placeholder="app.acme.com"
          onChange={(e) => setDraft(e.target.value)}
          helper={draft && !valid ? 'Enter an origin like app.acme.com.' : 'The domain your dApp runs on. The SDK is rejected anywhere else, so a stolen key can’t render messages on another site.'} />
        <div><Button disabled={!valid} onClick={() => { store.startPushInstall(draft.trim()); toast('Origin allowlisted. Install the snippet in your dApp'); }}>Generate install snippet</Button></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-primary)' }}>{push.origin}</span>
        {push.status === 'connected'
          ? <Badge status="success">Connected</Badge>
          : <Badge status="warning">Awaiting SDK</Badge>}
      </div>
      <InstallFlow status={push.status} sdk={push.sdkSeen} wallet={push.walletSeen} />
      {push.status !== 'connected' && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Add the snippet to your dApp and call <code style={{ fontFamily: 'var(--font-mono)' }}>identify()</code> when a wallet connects.
          In-app push stays blocked until we see both. A campaign sent to wallets no SDK asks about is delivered to nobody.
        </p>
      )}
      <SignalTable sdk={push.sdkSeen} wallet={push.walletSeen} />
      {push.status !== 'connected' && (
        <>
          <Snippet label="Script tag" code={snip.html} note="Drop this in your dApp’s <head>. No OS permission prompt. The SDK renders inside your page." />
          <Snippet label="Or install the package" code={`${snip.npm}\n\n${snip.init}`} />
        </>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {push.status !== 'connected' && (
          <Button size={compact ? 's' : 'm'} icon="refresh-cw" disabled={checking} onClick={check}>{checking ? 'Listening…' : 'Check connection'}</Button>
        )}
        <Button variant="tertiary" size={compact ? 's' : 'm'} icon="trash-2" onClick={() => { store.removePushInstall(); setDraft(''); toast('Origin removed'); }}>Remove origin</Button>
      </div>
    </div>
  );
}
