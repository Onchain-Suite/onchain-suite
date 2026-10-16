import { useState } from 'react';
import { Button, Input, Modal } from './ui';
import { Icon } from './icons';
import { toast } from './toast';
import { copyText } from '../data/persist';
import { SharingUnavailable, publicUrl, publish, revoke, usePublishedByMe } from '../data/published';
import type { ChartSpec } from '../data/chartBuilder';
import './publish.css';

/* Publishing a dashboard.
 *
 * The dialog's job is to make one thing unmissable before the link exists: anyone holding it
 * can read this, with no account and no sign-in. That sentence sits above the button rather
 * than under it, because a warning you meet after the irreversible click is decoration.
 *
 * Revoking is in the same place as publishing. A link you have to go hunting through Settings
 * to kill is one that stays alive.
 */
export function PublishDialog({ title, specs, lanes, onClose }: {
  title: string; specs: ChartSpec[]; lanes: boolean; onClose: () => void;
}) {
  const all = usePublishedByMe();
  const mine = all.filter((p: { title: string }) => p.title === title);
  const [name, setName] = useState(title);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  return (
    <Modal title="Publish this dashboard" onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Done</Button>
        <Button icon="globe" disabled={busy} onClick={async () => {
          setBusy(true); setFailed(null);
          try {
            const rec = await publish({ title: name, workspace: 'Acme', specs, lanes });
            await copyText(publicUrl(rec.token));
            toast('Link created and copied');
          } catch (e) {
            /* Never a link recorded locally on a failed publish: that is how you end up
               handing someone a URL that only ever worked in your own browser. */
            setFailed(e instanceof SharingUnavailable ? e.message : 'The request to the sharing service failed, so nothing was published. Check your connection and try again.');
          } finally {
            setBusy(false);
          }
        }}>{busy ? 'Creating…' : 'Create a link'}</Button>
      </>}>
      <div className="pub">
        <Input label="What to call it" value={name} onChange={(e) => setName(e.target.value)}
          helper="Shown at the top of the shared page." />

        <p className="pub__what">
          <Icon name="check-circle-2" size={14} />
          <span>
            {lanes ? 'The three-lane chart and ' : ''}{specs.length} chart{specs.length === 1 ? '' : 's'} from
            this dashboard, recomputed every time the page is opened, not a snapshot that goes stale.
          </span>
        </p>

        {/* Said before the link exists, not after. */}
        <p className="pub__warn">
          <Icon name="alert-triangle" size={14} />
          <span>
            <b>Anyone with the link can read it, without signing in.</b> It shows aggregate
            numbers only (no wallet addresses and no contacts), but treat the link itself as
            the password, because that is what it is.
          </span>
        </p>

        {failed && (
          <p className="pub__warn" role="alert">
            <Icon name="alert-triangle" size={14} />
            <span>{failed}</span>
          </p>
        )}

        {mine.length > 0 && (
          <div className="pub__list">
            <span className="pub__lbl">Live links</span>
            {mine.map((p) => (
              <div className="pub__row" key={p.token}>
                <code>{publicUrl(p.token)}</code>
                <button type="button" onClick={() => { void copyText(publicUrl(p.token)); toast('Link copied'); }}
                  aria-label="Copy link"><Icon name="copy" size={14} /></button>
                <button type="button" className="pub__revoke"
                  onClick={async () => {
                    const gone = await revoke(p.token);
                    toast(gone ? 'Link turned off' : 'Could not turn it off. It is still live');
                  }}>Turn off</button>
              </div>
            ))}
            <p className="pub__note">
              Turning a link off takes effect immediately. It stops working for everyone holding it.
              Only this browser can do it: the key that revokes a link is kept here and never travels
              in the link itself, so clearing this browser&rsquo;s data leaves the dashboard published
              with no way to take it down.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
