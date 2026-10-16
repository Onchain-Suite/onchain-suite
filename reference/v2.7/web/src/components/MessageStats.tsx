import type { ReactNode } from 'react';
import { Icon } from './icons';

/* Per-message performance, shared by automations (each step in a flow) and campaigns
 * (each channel in a send).
 *
 * The reason this is one component rather than two: both places were previously reporting
 * a single blended engagement number across email and in-app push, which is not a
 * meaningful average — an email open and a push view are different events with very
 * different base rates. Splitting the rows is the fix, and the split has to look and read
 * the same wherever it appears. */

/* Engagement base rates, kept here so automations and campaigns can't drift apart — and so
 * they stay tied to the figures Analytics publishes. Email and push are deliberately
 * separate: an open and a view are different events, and averaging them means nothing. */
export const EMAIL_OPEN = 0.423;  // matches the Email open rate reported in Analytics
export const EMAIL_CTR = 0.118;   // clicks ÷ delivered, not ÷ opens
export const PUSH_VIEW = 0.906;   // in-app push is seen far more often — it waits for the wallet
export const PUSH_CTR = 0.303;    // clicks ÷ viewed, mirroring the push funnel in Analytics

export type MessageStat = {
  id: string;
  kind: 'email' | 'push';
  label: string;
  /** Wallets this message actually went to — its own denominator, not the parent total. */
  sent: number;
  /** Opens for email, views for push. */
  engaged: number;
  engagedRate: number;
  clicked: number;
  clickRate: number;
};

const fmtN = (n: number) => n.toLocaleString('en-US');

export function MessageStatsTable({ rows, firstCol = 'Message', sentHint, note }: {
  rows: MessageStat[];
  firstCol?: string;
  /** What the "Sent" number means here — reached a step, or was routed to a channel. */
  sentHint: string;
  note: ReactNode;
}) {
  return (
    <>
      <div className="msgs">
        <div className="msgs__head">
          <span>{firstCol}</span><span>Sent</span><span>Opened / viewed</span><span>Clicked</span>
        </div>
        {rows.map((m) => (
          <div className="msgs__row" key={m.id}>
            <span className="msgs__name">
              <span className={`msgs__icn msgs__icn--${m.kind}`}>
                <Icon name={m.kind === 'email' ? 'mail' : 'smartphone'} size={13} />
              </span>
              <b>{m.label}</b>
            </span>
            <span className="msgs__n"><b>{fmtN(m.sent)}</b><span>{sentHint}</span></span>
            <span className="msgs__n">
              <b>{m.engagedRate.toFixed(1)}%</b>
              <span>{fmtN(m.engaged)} {m.kind === 'email' ? 'opened' : 'viewed'}</span>
            </span>
            <span className="msgs__n"><b>{m.clickRate.toFixed(1)}%</b><span>{fmtN(m.clicked)} clicked</span></span>
          </div>
        ))}
      </div>
      <p className="msgs__note">
        <Icon name="info" size={13} color="var(--text-tertiary)" style={{ flexShrink: 0, marginTop: 2 }} />
        {/* One element, or flex splits the copy around inline tags into separate items. */}
        <span>{note}</span>
      </p>
    </>
  );
}
