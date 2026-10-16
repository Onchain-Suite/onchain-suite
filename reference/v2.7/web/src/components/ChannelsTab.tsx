import { useState } from 'react';
import { Badge, Button, Modal } from './ui';
import { Icon, type IconName } from './icons';
import { SenderDomainPanel } from './SenderDomain';
import { PushInstallPanel } from './PushInstall';
import { MobilePushInstallPanel } from './MobilePushInstall';
import { XPanel } from './SocialConnect';
import { HandoffForm, HandoffInline, HandoffPending } from './Handoff';
import { useChannelReadiness, type ChannelReadiness } from '../data/store';
import './channels.css';

/* Integrations → Channels: where messages go out.
 *
 * This was every channel's full setup form, stacked and open at once, under a 540px handoff
 * form that came before any channel did. To learn whether email worked you scrolled past a
 * delegation checklist, then read DNS records. Nothing on the page said, in one place, which
 * channels were live and which were not — and the three channels appeared twice, once as
 * handoff checkboxes and once as forms.
 *
 * Now it reads like the Sources directory next door: the state of every channel first, one
 * row each, with what is blocking it in plain words; open a row for its setup. Handing setup
 * to someone else moved inside each channel, next to the steps it hands over, and the bulk
 * version is one button. Web and mobile push are one channel with two installs, because they
 * reach the same people by the same mechanism. */

type ChannelId = ChannelReadiness['id'];

const CHANNELS: Record<ChannelId, { icon: IconName; reaches: string; setup: string }> = {
  email: { icon: 'mail', reaches: 'Anyone with an email address',
    setup: 'Verify a sending domain so mail leaves as you rather than as us. Until it resolves, email cannot send.' },
  push: { icon: 'smartphone', reaches: 'Wallets connected to your dApp or app',
    setup: 'Install the SDK. Push cannot send until it has reported a connected wallet or a registered device.' },
  x: { icon: 'twitter', reaches: 'Followers who have linked a wallet',
    setup: 'Authorise DM access. X only allows DMs to accounts that follow you, so reach grows with linked followers.' },
};

const STATUS: Record<ChannelReadiness['status'], { label: string; badge: 'success' | 'warning' | 'neutral' }> = {
  connected: { label: 'Connected', badge: 'success' },
  pending: { label: 'Waiting', badge: 'warning' },
  none: { label: 'Not set up', badge: 'neutral' },
};

export function ChannelsTab() {
  const channels = useChannelReadiness();
  const [open, setOpen] = useState<ChannelId | null>(null);
  const [handing, setHanding] = useState(false);
  const live = channels.filter((c) => c.status === 'connected').length;
  const current = channels.find((c) => c.id === open);

  if (current) return <ChannelDetail c={current} onBack={() => setOpen(null)} />;

  return (
    <div className="chsetup">
      <div className="chsetup__head">
        <div>
          <h2>Channels</h2>
          <p>{live} of {channels.length} can send. Each needs one setup step. Open a channel to do it, or send the steps to whoever holds the keys.</p>
        </div>
        <Button variant="secondary" icon="send" onClick={() => setHanding(true)}>Send setup to someone</Button>
      </div>

      <HandoffPending />

      <ul className="chsetup__list">
        {channels.map((c) => {
          const meta = CHANNELS[c.id];
          const st = STATUS[c.status];
          return (
            <li key={c.id}>
              <button type="button" className="chsetup__row" onClick={() => setOpen(c.id)}>
                <span className="chsetup__ic"><Icon name={meta.icon} size={18} /></span>
                <span className="chsetup__tx">
                  <b>{c.label}</b>
                  <span>{c.blocker ?? meta.reaches}</span>
                </span>
                <Badge status={st.badge}>{st.label}</Badge>
                <span className="chsetup__go">{c.status === 'connected' ? 'Manage' : 'Set up'}<Icon name="chevron-right" size={15} /></span>
              </button>
            </li>
          );
        })}
      </ul>

      {handing && (
        <Modal title="Send setup to someone else" onClose={() => setHanding(false)} wide>
          <p className="chsetup__modalsub">Each task arrives with its own instructions and a link back here, and turns green on this page as it is finished.</p>
          <HandoffForm compact onDone={() => setHanding(false)} />
        </Modal>
      )}
    </div>
  );
}

function ChannelDetail({ c, onBack }: { c: ChannelReadiness; onBack: () => void }) {
  const meta = CHANNELS[c.id];
  const st = STATUS[c.status];
  return (
    <div className="chsetup">
      <button type="button" className="chsetup__back" onClick={onBack}>
        <Icon name="arrow-left" size={15} />Channels
      </button>
      <header className="chsetup__dhead">
        <span className="chsetup__ic chsetup__ic--lg"><Icon name={meta.icon} size={22} /></span>
        <div>
          <h2>{c.label}</h2>
          <p>{meta.setup}</p>
        </div>
        <Badge status={st.badge}>{st.label}</Badge>
      </header>
      {c.blocker && <p className="chsetup__blocker"><Icon name="info" size={14} />{c.blocker}</p>}

      {c.id === 'email' && <SenderDomainPanel compact />}
      {c.id === 'push' && (
        <>
          <section className="chsetup__part">
            <h3>Web</h3>
            <PushInstallPanel compact />
          </section>
          <section className="chsetup__part">
            <h3>Mobile</h3>
            <p>A separate SDK and store credentials. The OS delivers these, so it sets the rules.</p>
            <MobilePushInstallPanel compact />
          </section>
        </>
      )}
      {c.id === 'x' && <XPanel />}

      {/* Next to the steps it hands over, rather than above every channel at once. */}
      {c.status !== 'connected' && (
        <div className="chsetup__hand">
          <b>Not yours to do?</b>
          <HandoffInline channel={c.id} />
        </div>
      )}
    </div>
  );
}
