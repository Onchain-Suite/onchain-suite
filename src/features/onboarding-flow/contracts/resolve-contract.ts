/*
 * Wire contracts for the contract step of onboarding (backend
 * `src/onboarding/contracts`, 2026-11-11): reading a pasted address off the
 * chain, and telling us about a chain we do not index. Types only.
 */

/** Standard reported by `POST /onboarding/resolve-contract` (real chain read). */
export type ResolvedContractStandard =
  "erc20" | "erc721" | "erc1155" | "unknown";
export type ResolvedContractKind = "token" | "nft" | "other";

/**
 * Why nothing resolved.
 *  - `not-evm`  not a 0x address
 *  - `no-chain` the chain named is not one we can read
 *  - `no-code`  the chains that answered hold no contract at the address
 *  - `error`    no chain answered, so nothing can be said either way
 */
export type ResolveMissReason = "not-evm" | "no-chain" | "no-code" | "error";

/** A chain as the backend names it (slug) and as a person reads it (label). */
export interface ChainRef {
  chain: string;
  chainLabel: string;
}

/** A real contract read off-chain: what the pasted address actually is. */
export interface ResolvedContractFound extends ChainRef {
  found: true;
  address: string;
  standard: ResolvedContractStandard;
  kind: ResolvedContractKind;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  logo: string | null;
  verifiedOnChain: true;
  /**
   * Other chains the same address also holds code on. Only the person knows
   * which deployment they mean, so these are offered, never picked for them.
   */
  alsoOn: ChainRef[];
}

/** No contract resolved. */
export interface ResolvedContractMiss {
  found: false;
  address: string;
  reason: ResolveMissReason;
  /** LABELS of the chains that answered "no contract here". */
  chainsTried?: string[];
  /** LABELS of the chains that did not answer, so "not found" is not overclaimed. */
  chainsUnreachable?: string[];
}

export type ResolvedContract = ResolvedContractFound | ResolvedContractMiss;

export interface ResolveContractBody {
  address: string;
  /** The one chain to read. Left out, the backend looks on every indexed chain. */
  chain?: string;
  /** The project's chains: preferred when the address is on several. */
  chains?: string[];
}

/** Body of `POST /onboarding/chain-request`. */
export interface ChainRequestBody {
  /** The chain in the person's words: a name, a chain id, an explorer host. */
  chain: string;
  address?: string;
}

/**
 * `POST /onboarding/chain-request`. `recorded: false` means the name is a
 * chain we already index (an alias, a chain id): read the address there.
 */
export type ChainRequestResult =
  { recorded: true; chain: string } | { recorded: false; supported: ChainRef };
