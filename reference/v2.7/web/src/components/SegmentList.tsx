import { Icon } from './icons';
import type { Segment } from '../data/types';
import { useX } from '../data/store';
import { reachFor, ruleChipsFor, segmentUsage } from '../data/relationships';
import './segment-list.css';
import { useSegments } from '../data/store';

/* Segments live in Audience and are read in Intelligence (2.7).
 *
 * A segment is a slice of the audience, so Audience is where you go to see the ones you have —
 * it sits alongside Contacts, Lists and Tags because those are the same kind of thing. Intelligence
 * keeps its own view because the question there is different: not "what segments exist" but
 * "what is true of this one". Same component, so the two can never drift into describing the
 * same segment differently.
 */
/* A saved segment, 2.7 (#segment-row).
 *
 * Before this the row said a name, a sentence and a total. Three things it did not say, each
 * of which someone had to find out the hard way:
 *   - which campaigns are built on it, so editing the rules is no longer a blind change;
 *   - what it is actually worth per channel — 1,204 wallets is not 1,204 X followers,
 *     and the bot's opt-in list caps it far below the segment;
 *   - the rules themselves, as separate conditions, so a wrong one is visible without opening
 *     the builder.
 */
export function SegmentRow({ s }: { s: Segment }) {
  const x = useX();
  const usage = segmentUsage(s.id);
  const chips = ruleChipsFor(s);
  const reach = reachFor(s, x.reachableFollowers);

  return (
    <div className="segrow">
      <div className="segrow__top">
        <span className="seglist__ic"><Icon name="users" size={16} /></span>
        <span className="segrow__name">
          <b>{s.name}</b>
          <span className="segrow__chips">
            {chips.map((c) => <i key={c} className="segchip">{c}</i>)}
          </span>
        </span>
        <span className="seglist__count"><b>{s.count.toLocaleString('en-US')}</b><span>synced {s.synced}</span></span>
      </div>

      <div className="segrow__reach">
        {reach.map((r) => (
          <span key={r.channel} className={`segreach${r.count === 0 ? ' segreach--nil' : ''}`}>
            <b>{r.count.toLocaleString('en-US')}</b>
            <span>{r.label}</span>
          </span>
        ))}
      </div>

      {usage.campaigns.length > 0 && (
        <p className={`segused${usage.live > 0 ? ' segused--live' : ''}`}>
          <Icon name={usage.live > 0 ? 'triangle-alert' : 'megaphone'} size={13} />
          {usage.live > 0
            ? <>Used by {usage.campaigns.length} campaign{usage.campaigns.length > 1 ? 's' : ''}, <b>{usage.live} still scheduled or sending</b>. Editing these rules changes who they go to.</>
            : <>Used by {usage.campaigns.length} campaign{usage.campaigns.length > 1 ? 's' : ''}, none of them live. Safe to edit.</>}
          <span className="segused__names">{usage.campaigns.map((c) => c.name).join(' · ')}</span>
        </p>
      )}
    </div>
  );
}

export function SegmentList({ segments: given }: { segments?: Segment[] }) {
  const all = useSegments();
  const segments = given ?? all;
  return (
    <div className="seglist">
      {segments.map((s) => <SegmentRow key={s.id} s={s} />)}
    </div>
  );
}
