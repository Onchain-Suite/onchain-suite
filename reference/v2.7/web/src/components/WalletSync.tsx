import { useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Modal, Select } from './ui';
import { Icon } from './icons';
import { loadPersisted, savePersisted } from '../data/persist';
import { CONTACTS } from '../data/mock';
import { agoLabel, runEnrichment, type EnrichRun } from '../data/enrichment';
import {
  CREDIT_TOPUP, buyCredits, creditCostUsd, planSpend, spendCredits, topUpPriceLabel, useCredits,
} from '../data/credits';
import { CREDITS_PER_ENRICHMENT } from '../data/pricing';
import './walletSync.css';

/* One button, in both places (2.7).
 *
 * Audience had "Sync wallets" and Intelligence had "Enrich" — two names, two dialogs, two halves
 * of the same job. Now it is one action with one result, rendered from one component, so the
 * two screens cannot tell different stories about when the audience was last read or what was
 * found. Which screen you launch it from changes nothing except where you happened to be.
 *
 * The steps are named because the job takes minutes and a bare spinner makes a pause look
 * like a hang. They read in the order the work actually happens: find wallets, then learn
 * things about them.
 */
const STEPS = [
  'Reading holders from your contracts',
  'Adding wallets you did not have',
  'Reading balances',
  'Resolving chains',
  'Matching protocols',
  'Reading token holdings',
  'Rescoring lifecycle',
];

/* A real shared store, not usePersistedState.
 *
 * usePersistedState gives every caller its own useState and writes through to localStorage, so
 * two components on the same key are independent until the next reload. That is fine for a
 * key one screen owns and wrong here: syncing from Audience left Intelligence's header still saying
 * "never synced" until you refreshed, which is precisely the disagreement merging the two
 * actions was meant to end. One module-level value, and everyone reading it re-renders. */
let syncRun: EnrichRun | null = loadPersisted<EnrichRun | null>('lastSync', null);
const syncSubs = new Set<() => void>();
const subscribeSync = (fn: () => void) => { syncSubs.add(fn); return () => { syncSubs.delete(fn); }; };

export function setWalletSync(run: EnrichRun) {
  syncRun = run;
  savePersisted('lastSync', run);
  syncSubs.forEach((fn) => fn());
}

/** Back to never-synced — an empty workspace has no holder list to have read. */
export function clearWalletSync() {
  syncRun = null;
  savePersisted('lastSync', null);
  syncSubs.forEach((fn) => fn());
}

/** The last sync, shared by every screen that shows it. */
export function useWalletSync(): EnrichRun | null {
  return useSyncExternalStore(subscribeSync, () => syncRun, () => syncRun);
}

export function SyncButton({ onOpen, size = 's', variant = 'secondary' }: {
  onOpen: () => void; size?: 's' | 'm'; variant?: 'primary' | 'secondary';
}) {
  return <Button variant={variant} size={size} icon="refresh-cw" onClick={onOpen}>Sync wallets</Button>;
}

export function SyncStatus({ run, onOpen }: { run: EnrichRun | null; onOpen: () => void }) {
  return (
    <span className="sync__status">
      <Icon name="database" size={13} color="var(--action-primary)" />
      {run
        ? `Last synced ${agoLabel(run.at)} · ${run.scanned.toLocaleString('en-US')} wallets`
        : `${CONTACTS.length.toLocaleString('en-US')} wallets · never synced`}
      <SyncButton onOpen={onOpen} />
    </span>
  );
}

export function SyncModal({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const credits = useCredits();
  const [result, setResult] = useState<EnrichRun | null>(null);
  const [phase, setPhase] = useState<'form' | 'running' | 'done'>('form');
  const [step, setStep] = useState(0);

  /* Costed before it runs, not after. A sync reads every wallet it finds, and at four credits
     each a large contract is a real amount of the allowance — which is worth seeing while the
     Cancel button is still on screen. */
  const wallets = CONTACTS.filter((c) => c.address).length;
  const spend = planSpend(wallets);

  const start = () => {
    setPhase('running');
    setStep(0);
    STEPS.forEach((_, i) => setTimeout(() => setStep(i + 1), 420 * (i + 1)));
    setTimeout(() => {
      // Debit for what was actually read, which is what the balance could cover.
      const paidFor = spendCredits(wallets);
      const r = { ...runEnrichment(CONTACTS), creditsSpent: paidFor * CREDITS_PER_ENRICHMENT, walletsSkipped: wallets - paidFor };
      setResult(r); setWalletSync(r); setPhase('done');
    }, 420 * STEPS.length + 300);
  };

  return (
    <Modal title="Sync wallets" onClose={onClose}
      footer={phase === 'form'
        ? <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={start}>Start sync</Button></>
        : phase === 'done'
          ? <><Button variant="secondary" onClick={onClose}>Close</Button>
            <Button icon="line-chart" onClick={() => { onClose(); nav('/analytics'); }}>See it on the Dashboard</Button></>
          : undefined}>
      {phase === 'form' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Said once, plainly, because the old split made people guess which half they
              needed — and the answer was nearly always both. */}
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            Reads your indexed contracts, <b>adds</b> any holders the audience is missing, and <b>refreshes</b> on-chain
            metrics for every wallet you already have. Segments, scores and triggers use the result.
          </p>
          <Select label="Contracts to read" options={[
            { value: 'all', label: 'All indexed contracts' },
            { value: 'packs', label: 'Acme Packs only' },
            { value: 'staking', label: 'Acme Staking only' },
          ]} />

          {/* Costed before it runs, while Cancel is still on screen. */}
          <div className={`cred${spend.enough ? '' : ' cred--short'}`}>
            <div className="cred__row">
              <span>This sync</span>
              <b>{spend.cost.toLocaleString('en-US')} credits</b>
              <i>{wallets.toLocaleString('en-US')} wallets × {CREDITS_PER_ENRICHMENT}</i>
            </div>
            <div className="cred__row">
              <span>Balance after</span>
              <b>{Math.max(credits.left - spend.cost, 0).toLocaleString('en-US')} credits</b>
              <i>of {(credits.allowance + credits.bought).toLocaleString('en-US')} this period</i>
            </div>
            {!spend.enough && (
              <p className="cred__warn">
                <Icon name="triangle-alert" size={14} />
                <span>
                  Not enough for the whole run. We will read {spend.affordable.toLocaleString('en-US')} wallets and
                  stop, leaving {spend.short.toLocaleString('en-US')} unread. We would rather stop than charge a
                  card mid-job. {CREDIT_TOPUP.credits.toLocaleString('en-US')} more is ${CREDIT_TOPUP.usd}
                  {' '}({topUpPriceLabel()}).
                  <button type="button" onClick={() => buyCredits()}>Add {CREDIT_TOPUP.credits.toLocaleString('en-US')} credits</button>
                </span>
              </p>
            )}
          </div>
        </div>
      ) : phase === 'running' ? (
        <div className="enr__run" aria-live="polite">
          {STEPS.map((label, i) => (
            <div key={label} className={`enr__step${i < step ? ' is-done' : i === step ? ' is-now' : ''}`}>
              <span className="enr__dot">{i < step ? <Icon name="check" size={11} strokeWidth={2.5} /> : i + 1}</span>
              {label}
            </div>
          ))}
        </div>
      ) : result ? (
        <SyncResult run={result} />
      ) : null}
    </Modal>
  );
}

export function SyncResult({ run }: { run: EnrichRun }) {
  return (
    <div className="enr__done" aria-live="polite">
      <div className="enr__pair">
        <div className="enr__top"><b>{run.added.toLocaleString('en-US')}</b><span>wallets added</span></div>
        <div className="enr__top"><b>{run.updated.toLocaleString('en-US')}</b><span>refreshed</span></div>
        {run.creditsSpent != null && (
          <div className="enr__top"><b>{run.creditsSpent.toLocaleString('en-US')}</b>
            <span>credits spent · ${creditCostUsd(run.creditsSpent).toFixed(2)}</span></div>
        )}
      </div>
      {run.walletsSkipped ? (
        <p className="cred__warn" style={{ marginTop: 10 }}>
          <Icon name="triangle-alert" size={14} />
          <span>{run.walletsSkipped.toLocaleString('en-US')} wallets went unread. The balance ran out. Top up and run again to finish them.</span>
        </p>
      ) : null}

      <p className="enr__lbl">Where the new wallets came from</p>
      <div className="enr__srcs">
        {run.sources.map((s) => (
          <div className="enr__src" key={s.name}>
            <span>{s.name}</span>
            <i>{s.holders.toLocaleString('en-US')} holders</i>
            <b>+{s.added.toLocaleString('en-US')}</b>
          </div>
        ))}
      </div>

      <p className="enr__lbl">What was read</p>
      <div className="enr__fields">
        {run.fields.map((f) => (
          <div className="enr__field" key={f.label}>
            <span className="enr__fname">{f.label}</span>
            <span className="enr__ftrack"><i style={{ width: `${(f.filled / Math.max(f.of, 1)) * 100}%` }} /></span>
            <span className="enr__fnote">{f.note}</span>
          </div>
        ))}
      </div>

      <p className="enr__lbl">Most common, now that we can see it</p>
      <div className="enr__disc">
        {run.discovered.map((d) => (
          <span className="enr__chip" key={d.kind + d.label}><b>{d.label}</b><i>{d.wallets}</i></span>
        ))}
      </div>

      {run.findings.length > 0 && (
        <>
          <p className="enr__lbl">Worth acting on</p>
          <div className="enr__finds">
            {run.findings.map((f) => (
              <div className="enr__find" key={f.label}>
                <b>{f.count.toLocaleString('en-US')}</b>
                <span><b>{f.label}</b>{f.hint}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
