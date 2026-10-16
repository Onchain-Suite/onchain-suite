import { useMemo, useState } from 'react';
import { Button, Input, Select } from './ui';
import { Icon } from './icons';
import { ABI_NOTE, classify, resolveContractInput, type Candidate } from '../data/contractInput';
import './contract-resolver.css';

/* The one contract box, extracted (2.7).
 *
 * This lived inside the Data screen's add dialog. Onboarding needed the same thing, and the
 * version it had was the old four-field form — a name, an address, a type and a chain, asked
 * in the order that suits our database rather than the order anyone has answers in.
 *
 * Two implementations of the same box is how they drift: one learns about explorer links and
 * the other still rejects them, and which behaviour you get depends on which screen you
 * happened to open. So there is one, and both screens render it.
 */

export interface NewContract {
  name: string; address: string; chain: string; kind: string;
  activities: string[]; holders: number;
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const CHAINS = ['Base', 'Ethereum', 'Arbitrum', 'Optimism', 'Polygon'];
const KINDS = ['ERC-721 NFT', 'ERC-20 token', 'ERC-1155', 'Vault', 'Custom'];

/* The event chips double as the activity picker the old form had as a static row of verbs,
 * except these are the events the contract actually emits. All on by default: indexing one
 * costs nothing and a missing one is a trigger that silently never fires. */
function CandidateRow({ c, on, events, toggle, toggleEvent }: {
  c: Candidate; on: boolean; events: string[]; toggle: () => void; toggleEvent: (e: string) => void;
}) {
  return (
    <div className={`cand${on ? ' on' : ''}${c.likelyNoise ? ' cand--noise' : ''}`}>
      <label className="cand__pick">
        <input type="checkbox" checked={on} onChange={toggle} aria-label={`Index ${c.name}`} />
      </label>
      <span className="cand__main">
        <b>{c.name}</b>
        <span className="os-mono cand__addr">{c.address.slice(0, 10)}…{c.address.slice(-6)}</span>
      </span>
      <span className="cand__meta">
        <i>{c.chain}</i><i>{c.kind}</i><i>{c.holders.toLocaleString('en-US')} holders</i>
      </span>
      <span className="cand__ev">
        {c.events.map((e) => (
          <button type="button" key={e} className={events.includes(e) ? 'on' : ''}
            aria-pressed={events.includes(e)} onClick={() => toggleEvent(e)}>{e}</button>
        ))}
        {on && events.length === 0 && <em className="cand__warn">Pick at least one event to trigger on</em>}
      </span>
      {/* Where the interface came from, on the row, because it changes what the event names
          are worth. An inferred name is a guess and a Loop built on a guess never fires. */}
      <span className={`cand__abi cand__abi--${c.abi}`} title={ABI_NOTE[c.abi]}>
        <Icon name={c.abi === 'inferred' ? 'alert-triangle' : 'check-circle-2'} size={12} />
        {c.abi === 'inferred' ? 'Unverified' : c.abi === 'pasted' ? 'Pasted ABI' : 'Verified'}
      </span>
    </div>
  );
}

export function ContractResolver({ onChange, rows = 2, initial = '' }: {
  /** Fires on every change with what is currently selected — empty when nothing is ready. */
  onChange: (picked: NewContract[]) => void;
  rows?: number;
  /** Pre-filled input — the project named during onboarding, so it is not asked for twice. */
  initial?: string;
}) {
  const [raw, setRaw] = useState(initial);
  const [res, setRes] = useState<ReturnType<typeof resolveContractInput> | null>(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [evs, setEvs] = useState<Record<string, string[]>>({});
  const [manual, setManual] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', chain: 'Base', kind: 'ERC-721 NFT' });

  /* Classify on every keystroke, resolve only when asked. Telling someone what they pasted is
     free; enumerating a deployer's history is not, and doing it mid-paste would fire four
     times on one address. */
  const guess = useMemo(() => classify(raw), [raw]);
  const canLook = guess.form !== 'empty' && guess.form !== 'unknown'
    && !(guess.form === 'explorer' && !guess.value);

  const addrValid = ADDRESS_RE.test(form.address.trim());

  /* Selection is emitted from the handlers rather than an effect — an effect that calls a
     parent setter on every render is how these turn into loops. */
  const emit = (
    r = res, p = picked, e = evs,
    m = manual, f = form,
  ) => {
    if (m) {
      const ok = f.name.trim().length > 0 && ADDRESS_RE.test(f.address.trim());
      onChange(ok ? [{
        name: f.name.trim(), address: f.address.trim(), chain: f.chain, kind: f.kind,
        activities: ['Mint', 'Transfer'], holders: 0,
      }] : []);
      return;
    }
    const out = (r?.candidates ?? [])
      .filter((c) => p[c.address] && (e[c.address] ?? c.events).length > 0)
      .map((c) => ({
        name: c.name, address: c.address, chain: c.chain, kind: c.kind,
        activities: e[c.address] ?? c.events, holders: c.holders,
      }));
    onChange(out);
  };

  const look = () => {
    setBusy(true);
    // The real call is a round trip to the indexer; the pause is honest about that.
    window.setTimeout(() => {
      const r = resolveContractInput(raw);
      setRes(r); setBusy(false); setPicked({}); setEvs({});
      emit(r, {}, {});
    }, 420);
  };

  if (manual) {
    return (
      <div className="addc">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Contract name" placeholder="e.g. Acme Packs" value={form.name}
            onChange={(e) => { const f = { ...form, name: e.target.value }; setForm(f); emit(res, picked, evs, true, f); }} />
          {/* Specific and instructive — never "Invalid input". A wrong address here means
              weeks of a segment quietly matching nobody. */}
          <Input label="Contract address" mono placeholder="0x…" value={form.address}
            onChange={(e) => { const f = { ...form, address: e.target.value }; setForm(f); emit(res, picked, evs, true, f); }}
            helper={form.address && !addrValid
              ? 'Contract address must be 42 characters starting with 0x.'
              : 'We index holders and activity from this address.'} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Chain" value={form.chain} options={CHAINS.map((v) => ({ value: v, label: v }))}
              onChange={(e) => { const f = { ...form, chain: e.target.value }; setForm(f); emit(res, picked, evs, true, f); }} />
            <Select label="Type" value={form.kind} options={KINDS.map((v) => ({ value: v, label: v }))}
              onChange={(e) => { const f = { ...form, kind: e.target.value }; setForm(f); emit(res, picked, evs, true, f); }} />
          </div>
          <button type="button" className="addc__hand"
            onClick={() => { setManual(false); emit(res, picked, evs, false, form); }}>
            <Icon name="arrow-left" size={13} />Back to pasting a link or an address
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="addc">
      <div className="addc__in">
        <textarea value={raw} rows={raw.trim().startsWith('[') || raw.trim().startsWith('{') ? 5 : rows}
          onChange={(e) => { setRaw(e.target.value); setRes(null); setPicked({}); setEvs({}); onChange([]); }}
          aria-label="Contract address, link, website, symbol or ABI"
          placeholder={'Paste anything you have:\n0x1a2b…  ·  basescan.org/address/0x…  ·  acme.eth  ·  ACME  ·  acme.xyz  ·  or an ABI'} />
        <div className="addc__act">
          {/* What we think it is, as they type. Nobody should press a button to find out
              whether the thing they pasted was understood. */}
          <p className="addc__guess">
            {guess.form === 'empty'
              ? 'An address, a deployer wallet, an explorer link, an ENS name, a symbol, a website or an ABI.'
              : <><b>{guess.label}.</b> {guess.next}</>}
          </p>
          <Button icon="search" disabled={!canLook || busy} onClick={look}>
            {busy ? 'Looking…' : 'Look it up'}
          </Button>
        </div>
      </div>

      {res && res.kind === 'needs-address' && (
        <div className="addc__res">
          <p className="addc__sum">{res.summary}</p>
          {/* The ABI is kept, not thrown away — asking someone to paste it twice is how a
              rescue turns into a dead end. */}
          <Input label="Deployed at" mono placeholder="0x…" value={form.address}
            onChange={(e) => {
              const f = { ...form, address: e.target.value, name: form.name || 'Pasted contract', kind: 'Custom' };
              setForm(f);
              onChange(ADDRESS_RE.test(f.address.trim())
                ? [{ name: f.name, address: f.address.trim(), chain: f.chain, kind: 'Custom', activities: ['Transfer'], holders: 0 }]
                : []);
            }}
            helper="We will pair this address with the ABI you pasted." />
        </div>
      )}

      {res && res.candidates.length > 0 && (
        <div className="addc__res">
          <p className="addc__sum">{res.summary}</p>
          <div className="cands">
            {res.candidates.map((c) => (
              <CandidateRow key={c.address} c={c} on={!!picked[c.address]} events={evs[c.address] ?? c.events}
                toggle={() => {
                  const p = { ...picked, [c.address]: !picked[c.address] };
                  setPicked(p); emit(res, p, evs);
                }}
                toggleEvent={(e) => {
                  const p = { ...picked, [c.address]: true };
                  const cur = evs[c.address] ?? c.events;
                  const next = { ...evs, [c.address]: cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e] };
                  setPicked(p); setEvs(next); emit(res, p, next);
                }} />
            ))}
          </div>
          {res.candidates.some((c) => c.likelyNoise) && (
            <p className="addc__note">
              <Icon name="info" size={13} />
              <span>
                One of those looks like a test deployment: 11 holders, no recent activity. It is listed
                because we might be wrong, and left unticked because an audience full of dry-run wallets
                is worse than a missing contract.
              </span>
            </p>
          )}
        </div>
      )}

      {res && res.kind === 'none' && (
        <p className="addc__sum">Nothing we could read in that. Entering it by hand always works.</p>
      )}

      {/* Resolution against a real chain fails for real reasons, so this never goes away. */}
      <button type="button" className="addc__hand"
        onClick={() => { setManual(true); emit(res, picked, evs, true, form); }}>
        <Icon name="pencil" size={13} />Enter the details by hand
      </button>
    </div>
  );
}
