/**
 * One input for contracts (v2.7 onboarding revamp).
 *
 * Instead of asking for a name, address, chain and type, there is one box that takes whatever
 * is on the clipboard and we work out what it is:
 *   0x1a2b...          an address (contract or deployer wallet, resolved by looking, not asking)
 *   basescan.org/...   an explorer link to an address, token or transaction
 *   maya.eth           an ENS name
 *   ACME               a token or collection symbol
 *   acme.xyz           a website
 *   [{"type":"event"}] a pasted ABI, for a contract no explorer has verified
 *
 * This module is pure and server-safe: it classifies the pasted string and describes what we
 * would do with it. The actual resolution (asking the indexer / explorer) is a backend call,
 * wired separately - never a network call from here.
 */

export type InputForm =
  | "empty"
  | "address"
  | "ens"
  | "explorer"
  | "symbol"
  | "website"
  | "abi"
  | "unknown";

/**
 * Explorers we can read a verified ABI from. The host also tells us the chain, the one piece
 * of context a bare address cannot carry (the same address exists on every EVM chain).
 */
const EXPLORERS: Record<string, string> = {
  "etherscan.io": "Ethereum",
  "basescan.org": "Base",
  "arbiscan.io": "Arbitrum",
  "optimistic.etherscan.io": "Optimism",
  "polygonscan.com": "Polygon",
  "bscscan.com": "BNB Chain",
  "snowtrace.io": "Avalanche",
  "ftmscan.com": "Fantom",
  "gnosisscan.io": "Gnosis",
  "celoscan.io": "Celo",
  "lineascan.build": "Linea",
  "scrollscan.com": "Scroll",
  "blastscan.io": "Blast",
  "explorer.zksync.io": "zkSync",
  "blockscout.com": "Ethereum",
};

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const TXHASH_RE = /^0x[a-fA-F0-9]{64}$/;
const SYMBOL_RE = /^\$?[A-Za-z][A-Za-z0-9]{1,9}$/;

export interface Classified {
  form: InputForm;
  /** The part we will actually resolve - address, symbol, domain stem, or the raw ABI. */
  value: string;
  /** Only when the input told us, which in practice means an explorer link. */
  chain?: string;
  /** What we think this is, in the person's words not ours. */
  label: string;
  /** What we are about to do with it, shown before anything happens. */
  next: string;
}

const UNKNOWN: Classified = {
  form: "unknown",
  value: "",
  label: "We can't tell what this is",
  next: "Paste an address, an explorer link, a website or an ABI, or add the details by hand.",
};

/**
 * Parse an ABI the way a person pastes one: often a bare array, sometimes the whole artifact
 * object from a build, usually with trailing whitespace from a terminal.
 */
export function parseAbi(
  raw: string
): { events: string[]; functions: number } | null {
  const t = raw.trim();
  if (!t.startsWith("[") && !t.startsWith("{")) return null;
  let json: unknown;
  try {
    json = JSON.parse(t);
  } catch {
    return null;
  }
  const arr = Array.isArray(json)
    ? json
    : json &&
        typeof json === "object" &&
        Array.isArray((json as { abi?: unknown }).abi)
      ? (json as { abi: unknown[] }).abi
      : null;
  if (!arr) return null;
  const items = arr.filter(
    (x): x is { type?: string; name?: string } => !!x && typeof x === "object"
  );
  if (items.length === 0 || !items.some((x) => typeof x.type === "string")) {
    return null;
  }
  return {
    events: items
      .filter((x) => x.type === "event" && x.name)
      .map((x) => x.name as string),
    functions: items.filter((x) => x.type === "function").length,
  };
}

/** Classify a pasted contract input into a {@link Classified} description. Pure, no network. */
export function classify(raw: string): Classified {
  const t = raw.trim();
  if (!t) return { form: "empty", value: "", label: "", next: "" };

  const abi = parseAbi(t);
  if (abi) {
    return {
      form: "abi",
      value: t,
      label: "A contract ABI",
      next: abi.events.length
        ? `We read ${abi.events.length} event${abi.events.length === 1 ? "" : "s"} from it. Next we need the address it is deployed at.`
        : "No events in this ABI. Without them there is nothing to trigger on. Check you pasted the whole thing.",
    };
  }

  if (ADDRESS_RE.test(t)) {
    // Deliberately not "contract address": a 40-hex string is a contract on some chains and a
    // wallet on others, and the person often does not know which. We look it up, not ask.
    return {
      form: "address",
      value: t.toLowerCase(),
      label: "An address",
      next: "We check whether it holds code. A contract, we index it. A wallet, we list everything it deployed.",
    };
  }

  if (/^[a-z0-9][a-z0-9-]*\.eth$/i.test(t)) {
    return {
      form: "ens",
      value: t.toLowerCase(),
      label: "An ENS name",
      next: "We resolve it to an address, then treat it the same way, as a contract or a deployer.",
    };
  }

  const url = t.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  const host = url.split("/")[0].toLowerCase();
  const path = url.slice(host.length);

  // Subdomains count: people paste goerli.basescan.org and sepolia.etherscan.io by accident,
  // and a testnet address resolving silently against mainnet is the kind of wrong that shows
  // up weeks later as a segment matching nobody.
  const explorerHost =
    host in EXPLORERS
      ? host
      : Object.keys(EXPLORERS).find((h) => host.endsWith(`.${h}`));
  const chain = explorerHost ? EXPLORERS[explorerHost] : undefined;
  if (chain) {
    const hit = path.match(/0x[a-fA-F0-9]{40,64}/);
    if (!hit) {
      return {
        form: "explorer",
        value: "",
        chain,
        label: `An explorer on ${chain}`,
        next: "The link has no address in it. Open the contract or token page and copy that URL.",
      };
    }
    const [found] = hit;
    if (TXHASH_RE.test(found)) {
      // A transaction link is the most common thing a non-developer has (a receipt they were
      // sent). The contract is in it, so read it out rather than sending them back.
      return {
        form: "explorer",
        value: found.toLowerCase(),
        chain,
        label: `A transaction on ${chain}`,
        next: "We read the contract this transaction touched, then index that.",
      };
    }
    return {
      form: "explorer",
      value: found.toLowerCase(),
      chain,
      label: `${/\/token\//.test(path) ? "A token" : "An address"} on ${chain}`,
      next: `We pull the verified ABI from ${explorerHost}, so there is no need to paste one.`,
    };
  }

  if (/\.[a-z]{2,}$/i.test(host) && host.includes(".")) {
    return {
      form: "website",
      value: host,
      label: "A website",
      next: "We look for the contracts this project is known by, and you confirm which are yours.",
    };
  }

  if (SYMBOL_RE.test(t)) {
    return {
      form: "symbol",
      value: t.replace(/^\$/, "").toUpperCase(),
      label: "A token or collection symbol",
      next: "We search for matches across chains. Symbols are not unique, so you pick the right one.",
    };
  }

  return UNKNOWN;
}

/**
 * Where a resolved interface came from, which decides how much we can promise: a verified ABI
 * gives real event names; an unverified contract gives names we inferred and must flag.
 */
export type AbiSource = "verified" | "sourcify" | "pasted" | "inferred";

export const ABI_NOTE: Record<AbiSource, string> = {
  verified: "Verified source. Event names are the real ones.",
  sourcify: "Matched on Sourcify. Verified against the deployed bytecode.",
  pasted: "From the ABI you pasted.",
  inferred:
    "Not verified anywhere. We matched the event signatures against known standards, so names are our best guess. Check them before building an automation on one.",
};
