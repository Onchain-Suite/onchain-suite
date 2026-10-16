import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/icons';
import { Button } from '../components/ui';
import { store, useSender } from '../data/store';
import { SETUP_TASKS } from '../data/handoff';
import {
  CONTACT_STOPS, EMPTY_PROFILE, PLAN_TIERS, ROLES, SECTORS, STEP_LABEL, contactsLabel, flowFor, lookupFor, planFor,
  profileReady, smallestFit, tierOf, type ProjectProfile, type Role, type StepId,
} from '../data/guidedOnboarding';
import { SenderDomainPanel } from '../components/SenderDomain';
import { ContractResolver, type NewContract } from '../components/ContractResolver';
import { classify } from '../data/contractInput';
import { getPlan, sendPrice } from '../data/pricing';
import { setPlan, usePlan } from '../data/credits';
import { beginIndexing, enterEmptyWorkspace, requestOffer, saveProjectProfile } from '../data/workspace';
import logoUrl from '../assets-logo.svg';
import './guided-onboarding.css';

/* Onboarding: the project, who sets up the technical side, then a branch, then payment.
 *
 * The flow used to be seven screens that indexed the contract and enriched a 500-wallet
 * sample so it could show "your audience" before anyone had paid. That cost real money per
 * signup on people who might never convert. Everyone who reaches this screen has already had a
 * demo call, so the case for the product has been made.
 *
 * Whoever sets up the technical side goes on to the sending domain and then the contract;
 * someone handing it over sends the steps, still sees the sending domain, and skips the
 * contract (see flowFor). Payment comes last and can be skipped. Nothing is indexed before a
 * plan is chosen: a contract given here waits, and indexing starts once there is a plan. */

export default function GuidedOnboarding() {
  const nav = useNavigate();
  const current = usePlan();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<ProjectProfile>(EMPTY_PROFILE);
  const [role, setRole] = useState<Role>('builder');
  /* A plan is a tier (what you get) at a list size (how many contacts). Tier is chosen; size
     comes from the slider, and a tier that cannot hold the size hands over to one that can. */
  const initial = getPlan(current)?.selectable ? current : 'growth';
  const [tier, setTier] = useState(() => tierOf(initial)?.id ?? 'growth');
  const [contacts, setContacts] = useState<number>(() => getPlan(initial)!.allowances.contacts || 2_500);
  const plan = planFor(tier, contacts) ?? 'enterprise';
  const pickContacts = (n: number) => {
    setContacts(n);
    if (planFor(tier, n) === null) setTier(smallestFit(n));
  };
  const pickTier = (t: string) => { if (planFor(t, contacts) !== null) setTier(t); };

  const flow = flowFor(role);
  const at: StepId = flow[Math.min(step, flow.length - 1)];
  const last = flow.length - 1;
  const chosen = getPlan(plan);
  const sender = useSender();
  const [picked, setPicked] = useState<NewContract[]>([]);

  /* A new step starts at its question. Step 2 can run long once the handoff is open, so
     Continue sits low on the page — without this, step 3 opened scrolled past its own
     heading. Focus rather than scroll, so a screen reader hears the new step too. The first
     render is skipped: the project name has focus on arrival. */
  const bodyRef = useRef<HTMLDivElement>(null);
  const arrived = useRef(false);
  useEffect(() => {
    if (!arrived.current) { arrived.current = true; return; }
    const h = bodyRef.current?.querySelector('h1');
    if (h) { h.tabIndex = -1; h.focus(); }
  }, [step]);

  const finish = (choosePlan: boolean) => {
    if (choosePlan) {
      setPlan(plan);
      if (tier === 'enterprise') requestOffer(contacts);
    }
    const first = picked[0];
    const kept = first ? { ...profile, contract: first.address } : profile;
    saveProjectProfile(kept);
    // The sending domain set up a step ago is this workspace's, so the reset leaves it be.
    enterEmptyWorkspace(lookupFor(kept), { keepSender: true });
    // Indexing is the part that costs, so it starts with a plan and waits without one.
    if (choosePlan && picked.length) {
      store.addContracts(picked);
      beginIndexing(first.name);
    }
    store.completeOnboarding();
    nav('/home');
  };

  return (
    <div className="ob">
      <img className="ob__brand" src={logoUrl} alt="OnchainSuite" />
      <div className="ob__shell">
      <div className="ob__pane">
        {/* Counted, so it is obvious from the first screen that this ends quickly — a line of
            text and a thin bar rather than a row of boxed steps competing with the question. */}
        <header className="ob__top">
          <span className="ob__count">Step {step + 1} of {flow.length} <i>·</i> <b>{STEP_LABEL[at]}</b></span>
          <div className="ob__seg" role="progressbar" aria-valuemin={1} aria-valuemax={flow.length}
            aria-valuenow={step + 1} aria-valuetext={`Step ${step + 1} of ${flow.length}: ${STEP_LABEL[at]}`}>
            {flow.map((id, i) => <i key={id} className={i <= step ? 'is-on' : undefined} />)}
          </div>
        </header>

        <div className="ob__body" ref={bodyRef}>
          {at === 'project' && <StepProject value={profile} onChange={setProfile} onGo={() => setStep(1)} />}
          {at === 'technical' && <StepTechnical role={role} onRole={setRole} />}
          {at === 'dns' && <StepDns handingOver={role === 'operator'} />}
          {at === 'contract' && <StepContract initial={profile.contract || profile.website} onChange={setPicked} />}
          {at === 'plan' && <StepPlan tier={tier} contacts={contacts} onTier={pickTier} onContacts={pickContacts} />}
        </div>

        <footer className="ob__foot">
          {step > 0
            ? <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>
            : <span />}
          {step === last ? (
            <span className="ob__footacts">
              <Button variant="secondary" onClick={() => finish(false)}>Skip for now</Button>
              <Button trailingIcon="arrow-right" onClick={() => finish(true)}>
                {tier === 'enterprise' ? 'Request an offer' : <>Continue with {chosen?.name ?? 'this plan'}</>}
              </Button>
            </span>
          ) : (
            <Button trailingIcon="arrow-right" disabled={step === 0 && !profileReady(profile)}
              onClick={() => setStep(step + 1)}>
              {/* Neither setup step blocks: DNS resolves on its own schedule, and a contract
                  can be added later. The button says which it will be. */}
              {(at === 'dns' && sender.status === 'none') || (at === 'contract' && picked.length === 0)
                ? 'Skip for now' : 'Continue'}
            </Button>
          )}
        </footer>
      </div>

      <ObPreview lit={({ project: 'workspace', technical: 'channels', dns: 'channels', contract: 'audience', plan: 'charts' } as const)[at]} />
      </div>
      <div className="ob__legal">
        <span>© 2026 OnchainSuite</span>
        <a href="https://onchainsuite.xyz/privacy">Privacy</a>
        <a href="https://onchainsuite.xyz/support">Support</a>
      </div>
    </div>
  );
}


/* ---------------- 1 — the project ---------------- */

function StepProject({ value, onChange, onGo }: {
  value: ProjectProfile; onChange: (p: ProjectProfile) => void; onGo: () => void;
}) {
  const set = (k: keyof ProjectProfile) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });
  const guess = classify(value.contract);
  /* Enter moves on from any single-line field once the required three are filled — a form with
     several inputs and no visible submit button would otherwise do nothing on Enter. */
  const enter = (e: { key: string; preventDefault: () => void }) => {
    if (e.key === 'Enter' && profileReady(value)) { e.preventDefault(); onGo(); }
  };
  return (
    <>
      <h1>Tell us about your project</h1>
      <p className="ob__sub">Name, website and sector are all we need. The rest is optional.</p>
      <form className="ob__form" onSubmit={(e) => e.preventDefault()}>
        <div className="ob__row2">
          <div className="ob__field">
            <label htmlFor="ob-name">Project name</label>
            <div className="ob__input">
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <input id="ob-name" autoFocus required autoComplete="organization" value={value.name}
                onChange={set('name')} placeholder="Acme" onKeyDown={enter} />
            </div>
          </div>
          <div className="ob__field">
            <label htmlFor="ob-web">Website</label>
            <div className="ob__input">
              <input id="ob-web" required inputMode="url" autoComplete="url" value={value.website}
                onChange={set('website')} placeholder="acme.xyz" onKeyDown={enter} />
            </div>
          </div>
        </div>

        <div className="ob__row2">
          <div className="ob__field">
            <label htmlFor="ob-sector">Sector</label>
            <div className="ob__input ob__input--select">
              <select id="ob-sector" required value={value.sector} onChange={set('sector')}
                aria-describedby="ob-sector-hint">
                <option value="" disabled>Choose a sector</option>
                {SECTORS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
              <Icon name="chevron-down" size={15} />
            </div>
            <span className="ob__hint" id="ob-sector-hint">Helps us suggest what to track.</span>
          </div>
          <div className="ob__field">
            <label htmlFor="ob-contract">Contract address <i>Optional</i></label>
            <div className="ob__input">
              <input id="ob-contract" autoComplete="off" spellCheck={false} value={value.contract}
                onChange={set('contract')} placeholder="0x…" className="ob__mono" aria-describedby="ob-contract-hint" onKeyDown={enter} />
            </div>
            {/* The classifier runs locally; it says what it recognised and fetches nothing. */}
            <span className="ob__hint" id="ob-contract-hint">
              {guess.form === 'empty' || guess.form === 'unknown'
                ? 'If not, we find it from the website.'
                : <><b>{guess.label}.</b> Indexed first.</>}
            </span>
          </div>
        </div>

        <div className="ob__field">
          <label htmlFor="ob-desc">What does it do? <i>Optional</i></label>
          <div className="ob__input">
            <input id="ob-desc" value={value.description} onChange={set('description')} onKeyDown={enter}
              placeholder="A lending market on Base for long-tail assets" />
          </div>
        </div>
      </form>
    </>
  );
}

/* ---------------- 2 — who wires it up ---------------- */

function StepTechnical({ role, onRole }: { role: Role; onRole: (r: Role) => void }) {
  return (
    <>
      <h1>Who is setting up the technical side?</h1>
      <p className="ob__sub">
        The contract, sending domain and SDK usually sit with someone else. Send them the steps
        and carry on. You do not have to wait.
      </p>
      {/* Picking someone else puts their email field where the card's description was, so the
          step does not grow when the choice is made. A button cannot hold an input, so each
          card is a container with a full-size button behind its content and the field above it. */}
      <div className="ob__cards">
        {ROLES.map((r) => {
          const on = role === r.id;
          const delegating = on && r.id !== 'builder';
          return (
            <div key={r.id} className={`ob__card ob__card--hit${on ? ' on' : ''}`}>
              <button type="button" className="ob__cardhit" aria-pressed={on} aria-label={r.label}
                aria-describedby={`ob-role-${r.id}`} onClick={() => onRole(r.id)} />
              <span className="ob__cardic" aria-hidden><Icon name={r.icon} size={17} /></span>
              <span className="ob__cardtx">
                <b aria-hidden>{r.label}</b>
                {delegating ? <Delegate /> : <span id={`ob-role-${r.id}`}>{r.desc}</span>}
              </span>
              <span className="ob__cardtick" aria-hidden><Icon name="check" size={13} strokeWidth={3} /></span>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* One line, not the handoff form.
 *
 * The full form — a checklist of every task with its steps — opened under the cards and made
 * this step three times as long the moment "Someone else is" was picked. Here the only thing
 * worth asking is who to send it to; the steps go with it, and choosing which tasks to hand
 * over stays in Integrations → Channels. Optional: Continue never waits on it. */
function Delegate() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const valid = /.+@.+\..+/.test(email.trim());

  if (sent) {
    return (
      <span className="ob__sent">
        <Icon name="check-circle-2" size={14} />
        <span>Sent to <b>{sent}</b>. Carry on.</span>
      </span>
    );
  }
  return (
    <form className="ob__delegate" onSubmit={(e) => {
      e.preventDefault();
      if (!valid) return;
      store.sendHandoff(email.trim(), SETUP_TASKS.map((t) => t.id));
      setSent(email.trim());
    }}>
      <div className="ob__delegaterow">
        <div className="ob__input">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
            aria-label="Their email" placeholder="Their email" />
        </div>
        <Button type="submit" size="s" icon="send" disabled={!valid}
          title="Sends the domain, SDK and X setup, each with its instructions">Send steps</Button>
      </div>
    </form>
  );
}

/* ---------------- the sending domain ---------------- */

function StepDns({ handingOver }: { handingOver: boolean }) {
  return (
    <>
      <h1>Set up your sending domain</h1>
      <p className="ob__sub">
        {handingOver
          ? 'Two DNS records so email leaves as you. If you can reach your DNS, add them now; if not, skip, they are in the steps you sent.'
          : 'Two DNS records so email leaves as you rather than as us. They resolve on their own time, so you do not need to wait here.'}
      </p>
      <SenderDomainPanel compact />
    </>
  );
}

/* ---------------- the contract ---------------- */

function StepContract({ initial, onChange }: { initial: string; onChange: (c: NewContract[]) => void }) {
  return (
    <>
      <h1>Add your smart contract</h1>
      <p className="ob__sub">
        An address, an explorer link, your website or the ABI. We find the contract and its events, and
        you confirm which to track. Indexing starts once your plan is active.
      </p>
      {/* Opens on what step 1 already has, so nothing is typed twice. */}
      <ContractResolver onChange={onChange} initial={initial} />
    </>
  );
}

/* ---------------- the plan ---------------- */


const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

function StepPlan({ tier, contacts, onTier, onContacts }: {
  tier: string; contacts: number; onTier: (t: string) => void; onContacts: (n: number) => void;
}) {
  const at = Math.max(0, CONTACT_STOPS.indexOf(contacts as typeof CONTACT_STOPS[number]));
  const label = contactsLabel(contacts);
  return (
    <>
      <h1>Choose your plan</h1>
      <p className="ob__sub">You won&apos;t be charged here, and you can change it any time.</p>

      {/* One slider for list size; every tier below answers it. The stops are the plan
          boundaries, so each notch is a real change in what a tier costs or whether it fits. */}
      <div className="ob__size">
        <div className="ob__sizehead">
          <label htmlFor="ob-contacts">How many contacts?</label>
          <b>{label}</b>
        </div>
        <input id="ob-contacts" type="range" min={0} max={CONTACT_STOPS.length - 1} step={1} value={at}
          aria-valuetext={`${label} contacts`}
          style={{ ['--ob-fill' as string]: `${(at / (CONTACT_STOPS.length - 1)) * 100}%` }}
          onChange={(e) => onContacts(CONTACT_STOPS[Number(e.target.value)])} />
        <span className="ob__hint">A contact is one wallet, email address or X handle.</span>
      </div>

      {/* One row per tier, priced at the size above. A tier that cannot hold it says how far
          it goes instead, and cannot be picked. The row is a container with a full-size radio
          behind it, named by tier and price. */}
      <div className="ob__tiers" role="radiogroup" aria-label="Plan">
        {PLAN_TIERS.map((t) => {
          const id = planFor(t.id, contacts);
          const fits = id !== null;
          const on = tier === t.id;
          const p = getPlan(id ?? t.sizes[t.sizes.length - 1])!;
          const price = !fits ? null
            : p.custom ? 'Custom'
              : p.monthly !== null ? usd(p.monthly)
                : usd(Math.round(sendPrice(Math.min(contacts, CONTACT_STOPS[CONTACT_STOPS.length - 1])) * 100) / 100);
          const spoken = !fits ? 'not available at this size'
            : p.custom ? 'custom pricing' : `${price} a month`;
          return (
            <div key={t.id} className={`ob__tier${on ? ' on' : ''}${fits ? '' : ' is-out'}`}>
              <button type="button" role="radio" aria-checked={on} aria-disabled={!fits} className="ob__tierhit"
                aria-label={`${t.name}, ${spoken}`} aria-describedby={`ob-tier-${t.id}`}
                onClick={() => onTier(t.id)} />
              <span className="ob__tierdot" aria-hidden />
              <span className="ob__tiertx">
                <span className="ob__tierhead" aria-hidden>
                  <b>{t.name}{fits && p.id !== t.id && !p.custom ? <em>{p.name}</em> : null}</b>
                  <span className="ob__tierprice">
                    {price === null ? '' : price === 'Custom' ? price : <>{price}<i>/mo</i></>}
                  </span>
                </span>
                <span className="ob__tierline" id={`ob-tier-${t.id}`}>
                  {fits ? t.line : `Holds up to ${getPlan(t.sizes[t.sizes.length - 1])!.allowances.contacts.toLocaleString('en-US')} contacts.`}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}


/* The pane beside the form.
 *
 * It was a testimonial on a saturated brand panel — social proof, which is a landing-page
 * job. By the time someone is three steps into setup they have already decided to try this;
 * what helps now is seeing the thing they are building. So it is a quiet mock of the product
 * with the region the current step affects lit up: name your project and the sidebar's
 * workspace row lights; pick channels and the rail does.
 *
 * Muted on purpose. It sits next to the only thing on screen that should be asking for
 * attention, which is the question.
 */
type Lit = 'workspace' | 'audience' | 'channels' | 'charts' | 'none';

function ObPreview({ lit }: { lit: Lit }) {
  const rows = [0, 1, 2, 3, 4, 5, 6, 7];
  return (
    <aside className="obp" aria-hidden>
      <div className="obp__app">
        <div className={`obp__side${lit === 'workspace' ? ' is-lit' : ''}`}>
          <div className="obp__ws"><i /><b /></div>
          <div className="obp__search" />
          {['', '', '', '', ''].map((_, i) => (
            <div key={i} className={`obp__nav${lit === 'audience' && i === 2 ? ' is-on' : ''}`}><i /><b /></div>
          ))}
          <div className={`obp__group${lit === 'channels' ? ' is-lit' : ''}`}>
            <span />
            {['', '', ''].map((_, i) => <div key={i} className="obp__nav"><i /><b /></div>)}
          </div>
        </div>
        <div className="obp__main">
          <div className="obp__bar"><b /><span /></div>
          {lit === 'charts' ? (
            <div className="obp__chart">
              {[38, 52, 44, 66, 58, 78, 70, 92].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}
            </div>
          ) : (
            <div className={`obp__table${lit === 'audience' ? ' is-lit' : ''}`}>
              {rows.map((r) => <div key={r} className="obp__row"><i /><b /><span /><em /></div>)}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
