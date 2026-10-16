import { useState } from 'react';
import { Icon } from './icons';
import { Button, Modal } from './ui';
import { toast } from './toast';
import { store, useChannelReadiness, useHandoffStatus } from '../data/store';
import { SETUP_TASKS, taskById, totalMinutes, type HandoffChannel } from '../data/handoff';
import './handoff.css';

/* Setup handoff — the form, shared by onboarding and Settings.
 *
 * One component rather than two because the two surfaces have to agree about what is
 * outstanding. A Settings panel that thinks nothing has been sent, next to an onboarding
 * flow that already sent it, is worse than having neither. */

export function HandoffForm({ preselect, onDone, compact }: {
  /** Channels to tick by default — onboarding passes what the user said they use. */
  preselect?: HandoffChannel[];
  onDone?: () => void;
  compact?: boolean;
}) {
  const readiness = useChannelReadiness();
  const { handoff } = useHandoffStatus();
  // Anything already live needs no instructions; offering it would be noise.
  const needed = SETUP_TASKS.filter((t) => readiness.find((r) => r.id === t.id)?.status !== 'connected');
  const [picked, setPicked] = useState<HandoffChannel[]>(() => {
    const base = preselect?.length ? preselect : needed.map((t) => t.id);
    return base.filter((id) => needed.some((t) => t.id === id));
  });
  const [email, setEmail] = useState(handoff.email);
  const [expanded, setExpanded] = useState<HandoffChannel | null>(null);

  const toggle = (id: HandoffChannel) =>
    setPicked((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  const valid = /.+@.+\..+/.test(email.trim()) && picked.length > 0;

  if (needed.length === 0) {
    return (
      <div className="ho__done">
        <span className="ho__doneic"><Icon name="check-circle-2" size={18} /></span>
        <span>Every channel is connected. There is nothing left to hand over.</span>
      </div>
    );
  }

  return (
    <div className={`ho${compact ? ' ho--compact' : ''}`}>
      <div className="ho__list">
        {needed.map((t) => {
          const on = picked.includes(t.id);
          const open = expanded === t.id;
          return (
            <div className={`ho__task${on ? ' on' : ''}`} key={t.id}>
              <label className="ho__row">
                <input type="checkbox" checked={on} onChange={() => toggle(t.id)} />
                <span className="ho__tick" aria-hidden><Icon name="check" size={11} strokeWidth={3} /></span>
                <span className="ho__ic"><Icon name={t.icon} size={15} /></span>
                <span className="ho__tx">
                  <b>{t.label}</b>
                  <span>{t.who} · ~{t.minutes} min</span>
                </span>
              </label>
              {/* The steps are readable before sending, not just by the recipient. Handing
                  someone a task you can't see is how you end up unable to answer "what did
                  you actually send me?" three days later. */}
              <button type="button" className="ho__peek" aria-expanded={open}
                onClick={() => setExpanded(open ? null : t.id)}>
                {open ? 'Hide' : 'What they get'}<Icon name={open ? 'chevron-up' : 'chevron-down'} size={13} />
              </button>
              {open && (
                <div className="ho__steps">
                  <ol>{t.steps.map((st) => <li key={st}>{st}</li>)}</ol>
                  <p className="ho__gotcha"><Icon name="triangle-alert" size={13} />{t.gotcha}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="ho__send">
        <label htmlFor="ho-email">Send to</label>
        <div className="ho__sendrow">
          <div className="ho__input">
            <input id="ho-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="dev@yourteam.com" autoComplete="email" />
          </div>
          <Button disabled={!valid} icon="send"
            title={!picked.length ? 'Pick at least one thing to hand over' : !valid ? 'Enter a valid email' : undefined}
            onClick={() => {
              store.sendHandoff(email, picked);
              toast(`Setup instructions sent to ${email.trim()}`);
              onDone?.();
            }}>
            {handoff.sentAt && handoff.email === email.trim() ? 'Resend' : 'Send instructions'}
          </Button>
        </div>
        <p className="ho__note">
          {picked.length > 0
            ? <>They get {picked.length} task{picked.length === 1 ? '' : 's'}, the exact records and snippets, and a link back here. About {totalMinutes(picked)} minutes of work in total. You&apos;ll see each one go green as they finish.</>
            : <>Pick what you want to hand over. Anything you leave unticked stays yours to do in Integrations → Channels.</>}
        </p>
      </div>
    </div>
  );
}

/* Handoff as an affordance, not a destination (2.7).
 *
 * The form lived in two places: a step in onboarding and a section in Settings. Both are
 * places you have to already be. OneSignal puts "Need help? Invite a team member to complete
 * this step" on every screen that needs a credential — inline, at the blocker — and that is
 * the difference between a feature and a route out of a dead end.
 *
 * Every blocked channel panel and every blocked send now carries this. */
export function HandoffInline({ channel, compact }: { channel: HandoffChannel; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const { outstanding, handoff } = useHandoffStatus();
  const task = taskById(channel);
  const alreadySent = outstanding.includes(channel);

  if (alreadySent) {
    return (
      <span className={`hoi hoi--sent${compact ? ' hoi--compact' : ''}`}>
        <Icon name="clock" size={13} />Sent to {handoff.email}, waiting
      </span>
    );
  }

  return (
    <>
      <button type="button" className={`hoi${compact ? ' hoi--compact' : ''}`} onClick={() => setOpen(true)}>
        <Icon name="send" size={13} />Not your job? Send this to {task.who.replace(/^(a|whoever) /, '')}
      </button>
      {open && (
        <Modal title={`Hand over ${task.label.toLowerCase()}`} onClose={() => setOpen(false)}>
          <HandoffForm preselect={[channel]} compact onDone={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}

/** "a; b; and c" — a plain list read, so three outstanding channels do not run together. */
function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join('; ')}; and ${parts[parts.length - 1]}`;
}

/** The pending state, for the dashboard and Settings. Renders nothing until something
 *  has actually been sent and is still outstanding. */
export function HandoffPending({ onResend }: { onResend?: () => void }) {
  const { handoff, outstanding, done, waiting } = useHandoffStatus();
  if (!waiting) return null;
  return (
    <div className="ho__pending">
      <span className="ho__pendic"><Icon name="clock" size={15} /></span>
      <span className="ho__pendtx">
        <b>Waiting on {handoff.email}</b>
        <span>
          {outstanding.map((c) => taskById(c).label).join(', ')}, sent {handoff.sentAt}
          {handoff.sends > 1 ? ` · nudged ${handoff.sends} times` : ''}
          {done.length > 0 && <> · {done.length} already done</>}
        </span>
      </span>
      {onResend && (
        <button type="button" className="ho__resend" onClick={onResend}>Nudge</button>
      )}
      {/* "Sent 2h ago" is a fact about us, not about them. This says what would end the wait,
          which is the only thing worth knowing while you cannot do the work yourself. */}
      <span className="ho__watch">
        <i className="ho__pulse" aria-hidden="true" />
        Watching for {joinList(outstanding.map((c) => taskById(c).watching))}.
      </span>
    </div>
  );
}
