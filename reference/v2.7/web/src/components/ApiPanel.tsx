import { useState } from 'react';
import { Badge, Button, Input, Modal, Select, Switch } from './ui';
import { Icon } from './icons';
import { toast } from './toast';
import { copyText } from '../data/persist';
import { store, useApiKeys, useWebhooks } from '../data/store';

/* Developer API — the third thing Integrations should have held all along.
 *
 * Every plan sells "the developer API (Custom Events and in-app push SDK)", but Integrations
 * only ever exposed the two push SDKs. This adds the rest: the base URL, secret keys, and
 * webhooks for delivery events.
 *
 * The key flow is deliberately one-way. A secret is shown once at creation and only its
 * prefix is kept, because a dashboard that can re-display a secret is one that stores it
 * recoverably. The backend must hash on receipt and never persist the plaintext. */

export const API_BASE = 'https://api.onchainsuite.xyz/v1';

const ENDPOINTS = [
  { method: 'POST', path: '/identify', desc: 'Link a connected wallet to the workspace. Wallet addresses only.' },
  { method: 'POST', path: '/events', desc: 'Send a custom event to trigger Loops.' },
  { method: 'GET', path: '/contacts', desc: 'List contacts with reachability and tags.' },
  { method: 'POST', path: '/campaigns/:id/send', desc: 'Trigger a prepared campaign.' },
  { method: 'GET', path: '/messages/pending', desc: 'Queued in-app pushes for a wallet. Called by the SDK on connect.' },
];

const WEBHOOK_EVENTS = [
  'message.delivered', 'message.viewed', 'message.clicked',
  'contact.created', 'contact.unsubscribed', 'automation.completed',
];

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="api__row">
      <span className="api__lbl">{label}</span>
      <span className={`api__val${mono ? ' os-mono' : ''}`}>{value}</span>
      <button type="button" className="dns__copy" aria-label={`Copy ${label}`}
        onClick={async () => toast(await copyText(value) ? `${label} copied` : 'Copy failed. Select it manually')}>
        <Icon name="copy" size={14} />
      </button>
    </div>
  );
}

function NewKeyDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'read' | 'write'>('write');
  const [secret, setSecret] = useState<string | null>(null);

  if (secret) {
    return (
      <Modal title="Copy your key now" onClose={onClose}
        footer={<Button onClick={onClose}>Done</Button>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
            This is the only time the full key is shown. We store a prefix so you can identify it later. The rest is not recoverable. If you lose it, revoke the key and create another.
          </p>
          <div className="api__secret">
            <code>{secret}</code>
            <Button variant="secondary" size="s" icon="copy"
              onClick={async () => toast(await copyText(secret) ? 'Key copied' : 'Copy failed. Select it manually')}>Copy</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Create secret key" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => setSecret(store.createApiKey(name, scope))}>Create key</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Production server" helper="So you can tell keys apart when revoking one." />
        <Select label="Scope" value={scope} onChange={(e) => setScope(e.target.value as 'read' | 'write')}
          options={[{ value: 'write', label: 'Read and write' }, { value: 'read', label: 'Read only' }]}
          helper="Read-only keys cannot send campaigns or mutate contacts." />
      </div>
    </Modal>
  );
}

function NewWebhookDialog({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['message.delivered']);
  const valid = /^https:\/\/.+\..+/.test(url.trim());
  const toggle = (e: string) => setEvents((v) => (v.includes(e) ? v.filter((x) => x !== e) : [...v, e]));

  return (
    <Modal title="Add endpoint" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={!valid || !events.length}
          onClick={() => { store.addWebhook(url.trim(), events); onClose(); toast('Endpoint added'); }}>Add endpoint</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Endpoint URL" mono value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.yourdapp.com/hooks/onchainsuite"
          helper={url && !valid ? 'Must be an https URL.' : 'HTTPS only. Events carry contact data.'} />
        <div className="field">
          <span className="field__lbl">Events</span>
          <div className="api__events">
            {WEBHOOK_EVENTS.map((e) => (
              <button key={e} type="button" className={`api__ev${events.includes(e) ? ' on' : ''}`}
                aria-pressed={events.includes(e)} onClick={() => toggle(e)}>{e}</button>
            ))}
          </div>
          <p className="field__hint">{events.length} selected. We retry a failed delivery for 24 hours with backoff.</p>
        </div>
      </div>
    </Modal>
  );
}

/** `only` splits the panel so Data can show keys and webhooks as separate sections — they
 *  are different jobs and sat together only because Settings had one page for both. */
export function ApiPanel({ only }: { only?: 'keys' | 'webhooks' } = {}) {
  const keys = useApiKeys();
  const hooks = useWebhooks();
  const [dialog, setDialog] = useState<'key' | 'hook' | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {only !== 'webhooks' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Row label="Base URL" value={API_BASE} mono />
        <Row label="Auth header" value="Authorization: Bearer sk_live_…" mono />
      </div>
      )}

      {only !== 'webhooks' && (
      <div>
        <div className="api__head">
          <h4>Secret keys</h4>
          <Button variant="secondary" size="s" icon="plus" onClick={() => setDialog('key')}>Create key</Button>
        </div>
        <div className="api__list">
          {keys.map((k) => (
            <div className="api__item" key={k.id}>
              <span className="api__item__meta">
                <b>{k.name}</b>
                <span className="os-mono">{k.prefix}…</span>
              </span>
              <Badge status={k.scope === 'write' ? 'info' : 'neutral'}>{k.scope === 'write' ? 'Read/write' : 'Read only'}</Badge>
              <span className="api__item__when">{k.lastUsed ? `Used ${k.lastUsed}` : 'Never used'}</span>
              <Button variant="tertiary" size="s"
                onClick={() => { store.revokeApiKey(k.id); toast(`${k.name} revoked. Calls with it now fail`); }}>Revoke</Button>
            </div>
          ))}
          {!keys.length && <p className="api__empty">No keys. Create one to call the API.</p>}
        </div>
      </div>
      )}

      {only !== 'keys' && (
      <div>
        <div className="api__head">
          <h4>Webhooks</h4>
          <Button variant="secondary" size="s" icon="plus" onClick={() => setDialog('hook')}>Add endpoint</Button>
        </div>
        <div className="api__list">
          {hooks.map((w) => (
            <div className="api__item" key={w.id}>
              <span className="api__item__meta">
                <b className="os-mono">{w.url}</b>
                <span>{w.events.join(' · ')}</span>
              </span>
              <Switch label={`${w.url} active`} checked={w.active} onChange={() => store.toggleWebhook(w.id)} />
              <Button variant="tertiary" size="s" icon="trash-2"
                onClick={() => { store.removeWebhook(w.id); toast('Endpoint removed'); }}>Remove</Button>
            </div>
          ))}
          {!hooks.length && <p className="api__empty">No endpoints. Add one to receive delivery and contact events.</p>}
        </div>
      </div>
      )}

      {/* The endpoint reference is documentation for the keys above, not for webhooks. */}
      {only !== 'webhooks' && (
      <div>
        <div className="api__head"><h4>Endpoints</h4></div>
        <div className="api__eps">
          {ENDPOINTS.map((e) => (
            <div className="api__ep" key={e.path}>
              <span className={`api__m api__m--${e.method.toLowerCase()}`}>{e.method}</span>
              <code>{e.path}</code>
              <span>{e.desc}</span>
            </div>
          ))}
        </div>
        <p className="field__hint" style={{ marginTop: 10 }}>
          <Icon name="shield-check" size={13} color="var(--action-primary)" style={{ verticalAlign: -2, marginRight: 5 }} />
          <code>/identify</code> takes a wallet address and rejects email, phone or any other personal
          identifier. Sending one would hand you the wallet↔identity mapping your subscribers were told you cannot see.
        </p>
      </div>

      )}

      {dialog === 'key' && <NewKeyDialog onClose={() => setDialog(null)} />}
      {dialog === 'hook' && <NewWebhookDialog onClose={() => setDialog(null)} />}
    </div>
  );
}
