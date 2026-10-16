import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Icon } from '../components/icons';
import { SpecChart } from './SpecChart';
import { LanesChart } from './LanesChart';
import { computeSpec, describeSpec } from '../data/chartBuilder';
import { fetchPublished, type Published } from '../data/published';
import logoUrl from '../assets-logo.svg';
import './public-dashboard.css';

/* The published view.
 *
 * No shell, no nav, no account menu — not because they would look wrong, but because none of
 * them lead anywhere a reader of this page is allowed to go. A public dashboard that renders
 * the signed-in chrome invites every visitor to click Audience and meet a login wall, which
 * is a worse experience than not showing the door.
 *
 * It is the same SpecChart the workspace uses, reading the same spec. A published page that
 * renders through its own path is a page that drifts: the numbers agree today and disagree
 * after the next change to the chart engine.
 */
export default function PublicDashboard() {
  const { token = '' } = useParams();
  const [pub, setPub] = useState<Published | null>(null);
  const [state, setState] = useState<'loading' | 'done'>('loading');

  useEffect(() => {
    let live = true;
    fetchPublished(token).then((p) => {
      if (!live) return;
      setPub(p);
      setState('done');
    });
    return () => { live = false; };
  }, [token]);

  /* Nothing claimed while the record is in flight. A "not available" that appears for half a
     second before the real page is a worse answer than no answer. */
  if (state === 'loading') {
    return (
      <div className="pubd pubd--gone">
        <img src={logoUrl} alt="OnchainSuite" />
        <p>Loading…</p>
      </div>
    );
  }

  if (!pub) {
    /* Revoked and never-existed look identical on purpose. Telling a stranger "this link was
       real until someone turned it off" is more than they need to know. */
    return (
      <div className="pubd pubd--gone">
        <img src={logoUrl} alt="OnchainSuite" />
        <h1>This dashboard isn&rsquo;t available</h1>
        <p>The link may have been turned off, or it was never a link to anything. Ask whoever sent it for a new one.</p>
      </div>
    );
  }

  return (
    <div className="pubd">
      <header className="pubd__top">
        <div>
          <span className="pubd__ws">{pub.workspace}</span>
          <h1>{pub.title}</h1>
        </div>
        <span className="pubd__live" title="These charts recompute when the page loads.">
          <i />Live · recomputed just now
        </span>
      </header>

      <div className="pubd__body">
        {pub.lanes && <LanesChart />}
        {pub.specs.map((spec) => (
          <div className="card" key={spec.id}>
            <div className="card__head">
              <h2>{spec.title}</h2>
              <span className="m">{describeSpec(spec)}</span>
            </div>
            <SpecChart spec={spec} computed={computeSpec(spec)} />
          </div>
        ))}
        {pub.specs.length === 0 && !pub.lanes && (
          <p className="pubd__empty">This dashboard has no charts on it yet. Ask whoever shared the link to add some.</p>
        )}
      </div>

      <footer className="pubd__foot">
        <Icon name="shield" size={13} />
        <span>
          A shared, read-only view. It shows aggregate numbers only. No wallet addresses, no
          contacts, and nothing that can be clicked through to them.
        </span>
        <a href="https://onchainsuite.xyz" className="pubd__by">
          <img src={logoUrl} alt="" />OnchainSuite
        </a>
      </footer>
    </div>
  );
}
