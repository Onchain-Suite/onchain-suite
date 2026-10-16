/* One input for contracts (2.7).
 *
 * The old dialog asked for four things: a name, an address, a chain and a type. Every one of
 * them is knowledge the person evaluating usually does not have to hand, and the two that
 * matter are knowledge we can get ourselves. Worse, it asked in the order that suits our
 * database rather than the order the person has answers in — nobody thinks "ERC-1155" first.
 *
 * So there is one box now, and it takes whatever is in the clipboard:
 *
 *   0x1a2b…            an address — contract or deployer wallet, we work out which
 *   basescan.org/…     an explorer link to an address, token or transaction
 *   maya.eth        an ENS name
 *   ACME               a token or collection symbol
 *   acme.xyz           a website
 *   [{"type":"event"…  a pasted ABI, for a contract no explorer has verified
 *
 * Two rules hold this together. We never ask for an ABI up front: for a verified contract it
 * is a download, and demanding it turns a thirty-second task into a developer errand. And we
 * never ask "is this a contract or a wallet?" — the string cannot tell you, but one call to
 * the chain can, so asking is us making the person do our lookup.
 */

export type InputForm =
  | 'empty' | 'address' | 'ens' | 'explorer' | 'symbol' | 'website' | 'abi' | 'unknown';

/** Explorers we can read a verified ABI out of. The host also tells us the chain, which is
 *  the one piece of context a bare address genuinely cannot carry — the same address exists
 *  on every EVM chain and often holds something different on each. */
const EXPLORERS: Record<string, string> = {
  'etherscan.io': 'Ethereum',
  'basescan.org': 'Base',
  'arbiscan.io': 'Arbitrum',
  'optimistic.etherscan.io': 'Optimism',
  'polygonscan.com': 'Polygon',
  'bscscan.com': 'BNB Chain',
  'snowtrace.io': 'Avalanche',
  'ftmscan.com': 'Fantom',
  'gnosisscan.io': 'Gnosis',
  'celoscan.io': 'Celo',
  'lineascan.build': 'Linea',
  'scrollscan.com': 'Scroll',
  'blastscan.io': 'Blast',
  'explorer.zksync.io': 'zkSync',
  'blockscout.com': 'Ethereum',
};

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const TXHASH_RE = /^0x[a-fA-F0-9]{64}$/;
const SYMBOL_RE = /^\$?[A-Za-z][A-Za-z0-9]{1,9}$/;

export interface Classified {
  form: InputForm;
  /** The part we will actually resolve — address, symbol, domain stem, or the raw ABI. */
  value: string;
  /** Only when the input told us, which in practice means an explorer link. */
  chain?: string;
  /** What we think this is, in the person's words not ours. */
  label: string;
  /** What we are about to do with it. Shown before anything happens, because a resolve that
   *  enumerates a deployer's whole history should not be a surprise. */
  next: string;
}

const UNKNOWN: Classified = {
  form: 'unknown', value: '', label: "We can't tell what this is",
  next: 'Paste an address, an explorer link, a website or an ABI, or add the details by hand.',
};

/** Parse an ABI the way a person pastes one: often a bare array, sometimes the whole
 *  artifact object from a build, usually with trailing whitespace from a terminal. */
export function parseAbi(raw: string): { events: string[]; functions: number } | null {
  const t = raw.trim();
  if (!t.startsWith('[') && !t.startsWith('{')) return null;
  let json: unknown;
  try { json = JSON.parse(t); } catch { return null; }
  const arr = Array.isArray(json) ? json
    : (json && typeof json === 'object' && Array.isArray((json as { abi?: unknown }).abi))
      ? (json as { abi: unknown[] }).abi
      : null;
  if (!arr) return null;
  const items = arr.filter((x): x is { type?: string; name?: string } => !!x && typeof x === 'object');
  if (items.length === 0 || !items.some((x) => typeof x.type === 'string')) return null;
  return {
    events: items.filter((x) => x.type === 'event' && x.name).map((x) => x.name as string),
    functions: items.filter((x) => x.type === 'function').length,
  };
}

export function classify(raw: string): Classified {
  const t = raw.trim();
  if (!t) return { form: 'empty', value: '', label: '', next: '' };

  const abi = parseAbi(t);
  if (abi) {
    return {
      form: 'abi', value: t, label: 'A contract ABI',
      next: abi.events.length
        ? `We read ${abi.events.length} event${abi.events.length === 1 ? '' : 's'} from it. Next we need the address it is deployed at.`
        : 'No events in this ABI. Without them there is nothing to trigger on. Check you pasted the whole thing.',
    };
  }

  if (ADDRESS_RE.test(t)) {
    /* Deliberately not "contract address". A 40-hex string is a contract on some chains and a
       wallet on others, and the person pasting it frequently does not know which — that is
       the entire reason the deployer-wallet route is useful. We look it up instead of asking. */
    return {
      form: 'address', value: t.toLowerCase(), label: 'An address',
      next: 'We check whether it holds code. A contract, we index it. A wallet, we list everything it deployed.',
    };
  }

  if (/^[a-z0-9][a-z0-9-]*\.eth$/i.test(t)) {
    return {
      form: 'ens', value: t.toLowerCase(), label: 'An ENS name',
      next: 'We resolve it to an address, then treat it the same way, as a contract or a deployer.',
    };
  }

  const url = t.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  const host = url.split('/')[0].toLowerCase();
  const path = url.slice(host.length);

  /* Subdomains count: people paste goerli.basescan.org and sepolia.etherscan.io constantly,
     usually by accident, and a testnet address resolving silently against mainnet is the kind
     of wrong that shows up weeks later as a segment matching nobody. */
  const explorerHost = host in EXPLORERS ? host
    : Object.keys(EXPLORERS).find((h) => host.endsWith(`.${h}`));
  const chain = explorerHost ? EXPLORERS[explorerHost] : undefined;
  if (chain) {
    const hit = path.match(/0x[a-fA-F0-9]{40,64}/);
    if (!hit) {
      return {
        form: 'explorer', value: '', chain,
        label: `An explorer on ${chain}`,
        next: 'The link has no address in it. Open the contract or token page and copy that URL.',
      };
    }
    const found = hit[0];
    if (TXHASH_RE.test(found)) {
      /* A transaction link is the most common thing a non-developer has: they were sent a
         receipt. The contract is in it, so read it out rather than sending them back. */
      return {
        form: 'explorer', value: found.toLowerCase(), chain,
        label: `A transaction on ${chain}`,
        next: 'We read the contract this transaction touched, then index that.',
      };
    }
    return {
      form: 'explorer', value: found.toLowerCase(), chain,
      label: `${/\/token\//.test(path) ? 'A token' : 'An address'} on ${chain}`,
      next: `We pull the verified ABI from ${explorerHost}, so there is no need to paste one.`,
    };
  }

  if (/\.[a-z]{2,}$/i.test(host) && host.includes('.')) {
    return {
      form: 'website', value: host, label: 'A website',
      next: 'We look for the contracts this project is known by, and you confirm which are yours.',
    };
  }

  if (SYMBOL_RE.test(t)) {
    return {
      form: 'symbol', value: t.replace(/^\$/, '').toUpperCase(), label: 'A token or collection symbol',
      next: 'We search for matches across chains. Symbols are not unique, so you pick the right one.',
    };
  }

  return UNKNOWN;
}

/* What came back.
 *
 * The resolve is mocked deterministically — a real backend asks the indexer, Etherscan and
 * Sourcify — but the shape is the product decision and it is the part worth getting right.
 *
 * The important field is `abi`. Where the interface came from decides how much we can promise:
 * a verified ABI gives real event names, an unverified contract gives topic hashes we can
 * match against known standards and guess at, and a guess that is presented as a fact is how
 * someone builds a Loop on an event that never fires. */
export type AbiSource = 'verified' | 'sourcify' | 'pasted' | 'inferred';

export const ABI_NOTE: Record<AbiSource, string> = {
  verified: 'Verified source. Event names are the real ones.',
  sourcify: 'Matched on Sourcify. Verified against the deployed bytecode.',
  pasted: 'From the ABI you pasted.',
  inferred: 'Not verified anywhere. We matched the event signatures against known standards, so names are our best guess. Check them before building a Loop on one.',
};

export interface Candidate {
  name: string;
  address: string;
  chain: string;
  kind: string;
  holders: number;
  /** Events we can trigger on. Empty is a real outcome, not an error. */
  events: string[];
  abi: AbiSource;
  /** Deployments that look like tests, proxies or abandoned attempts. Pre-ticking those is
   *  how an audience quietly fills with 11 wallets from a Goerli dry run. */
  likelyNoise?: boolean;
}

export interface Resolution {
  input: Classified;
  /** 'contract' when the input was one thing; 'deployer' when it was a wallet with history. */
  kind: 'contract' | 'deployer' | 'search' | 'needs-address' | 'none';
  /** One line of plain English about what we found, shown above the list. */
  summary: string;
  candidates: Candidate[];
}

const KINDS = ['ERC-721', 'ERC-20', 'ERC-1155', 'Vault', 'Staking'];
const EVENTS: Record<string, string[]> = {
  'ERC-721': ['Transfer', 'Approval', 'Minted'],
  'ERC-20': ['Transfer', 'Approval'],
  'ERC-1155': ['TransferSingle', 'TransferBatch'],
  Vault: ['Deposit', 'Withdraw', 'Harvest'],
  Staking: ['Staked', 'Unstaked', 'RewardPaid'],
};

const seedOf = (s: string) => s.split('').reduce((a, c) => ((a * 33) ^ c.charCodeAt(0)) >>> 0, 5381);

/* Mock project names. Worth the twelve words: "Project 5 Staking" reads as a bug on a screen
   whose whole job is convincing someone we resolved their contract correctly. */
const NAMES = ['Orbital', 'Meridian', 'Lumen', 'Harbour', 'Kestrel', 'Vertex', 'Atlas', 'Nimbus',
  'Cinder', 'Pelagic', 'Juniper', 'Quartz'];
const titleCase = (s: string) =>
  s.split(/[-_.\s]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

function fakeAddress(seed: number, n: number): string {
  let h = '';
  for (let i = 0; i < 10; i += 1) h += (((seed * (n + 7) * (i + 3)) >>> 0) % 0xffff).toString(16).padStart(4, '0');
  return `0x${h.slice(0, 40)}`;
}

function candidate(stem: string, seed: number, n: number, chain: string, abi: AbiSource): Candidate {
  const kind = KINDS[(seed + n) % KINDS.length];
  const suffix = ['', ' Genesis', ' Staking', ' Rewards', ' V2', ' Treasury'][n % 6];
  return {
    name: `${titleCase(stem)}${suffix}`.trim(),
    address: fakeAddress(seed, n),
    chain,
    kind,
    holders: 180 + ((seed * (n + 1)) % 4200),
    events: EVENTS[kind],
    abi,
  };
}

/** Resolve whatever was pasted into contracts the person can tick. */
export function resolveContractInput(raw: string): Resolution {
  const input = classify(raw);
  const seed = seedOf(input.value || raw);
  const chain = input.chain ?? ['Base', 'Ethereum', 'Arbitrum', 'Optimism'][seed % 4];

  if (input.form === 'empty' || input.form === 'unknown') {
    return { input, kind: 'none', summary: '', candidates: [] };
  }

  if (input.form === 'abi') {
    /* An ABI alone is an interface with nothing behind it. We hold it and ask for the one
       thing it cannot contain, rather than rejecting the paste and losing the work. */
    const parsed = parseAbi(input.value);
    return {
      input, kind: 'needs-address',
      summary: parsed && parsed.events.length
        ? `Interface read: ${parsed.events.length} events, ${parsed.functions} functions. Add the address it is deployed at and we will index it.`
        : 'That parsed, but there are no events in it. Nothing to trigger on.',
      candidates: [],
    };
  }

  /* An address that turns out to be a wallet. Roughly half the time in this mock, because in
     real life the two are genuinely indistinguishable until you look, and the UI has to be
     built for both answers rather than for the one we expect. */
  const isDeployer = (input.form === 'address' || input.form === 'ens') && seed % 2 === 0;

  if (isDeployer) {
    const count = 3 + (seed % 3);
    const stem = NAMES[seed % NAMES.length];
    const list = Array.from({ length: count }, (_, i) => candidate(stem, seed, i, chain, i % 3 === 2 ? 'inferred' : 'verified'));
    /* Last one is marked as noise rather than hidden. Hiding it means a deliberate test
       deployment is unreachable; pre-ticking it means it ends up in the audience. */
    if (list.length > 2) list[list.length - 1] = { ...list[list.length - 1], name: `${list[list.length - 1].name} (test)`, holders: 11, likelyNoise: true };
    return {
      input, kind: 'deployer',
      summary: `That is a wallet, not a contract. It deployed ${count} contracts on ${chain}. Tick the ones that are part of your product.`,
      candidates: list,
    };
  }

  if (input.form === 'symbol' || input.form === 'website') {
    const n = input.form === 'symbol' ? 2 + (seed % 2) : 1 + (seed % 3);
    return {
      input, kind: 'search',
      summary: input.form === 'symbol'
        ? `${n} contracts use that symbol. Symbols are not unique and we will not guess. Confirm which is yours.`
        : `Found ${n} contract${n === 1 ? '' : 's'} linked to ${input.value}. Confirm before we index.`,
      candidates: Array.from({ length: n }, (_, i) =>
        candidate(input.value, seed, i, ['Base', 'Ethereum', 'Arbitrum'][(seed + i) % 3], i === 0 ? 'verified' : 'sourcify')),
    };
  }

  // A single contract: address, ENS pointing at one, or an explorer link.
  const abi: AbiSource = seed % 7 === 0 ? 'inferred' : input.form === 'explorer' ? 'verified' : 'sourcify';
  const one = candidate(NAMES[seed % NAMES.length], seed, 0, chain, abi);
  return {
    input, kind: 'contract',
    summary: abi === 'inferred'
      ? `Contract found on ${chain}, but nobody has verified its source.`
      : `Contract found on ${chain} with a verified interface. Nothing else needed.`,
    candidates: [one],
  };
}
