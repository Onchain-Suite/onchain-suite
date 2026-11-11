import type {
  ResolvedContract,
  ResolvedContractFound,
} from "../contracts/resolve-contract";

/* Pure rules for the address lookup on the project and contract steps. */

/** The chain picker's last option: "mine is not in this list". */
export const OTHER_CHAIN = "__other__";

/** The chain picker's first option: no chain picked, we look on all of them. */
export const ANY_CHAIN = "__any__";

export const EVM_ADDRESS_RE = /^0x[0-9a-f]{40}$/i;

/** A valid, lower-cased EVM address out of whatever was typed, else null. */
export const toAddress = (raw: string): string | null => {
  const t = raw.trim();
  return EVM_ADDRESS_RE.test(t) ? t.toLowerCase() : null;
};

/** Where the lookup stands, as the one thing the UI has to say. */
export type LookupState =
  | { kind: "idle" }
  | { kind: "invalid" }
  | { kind: "looking" }
  | { kind: "found"; contract: ResolvedContractFound }
  /** Chains answered, and none holds a contract at the address. */
  | { kind: "nowhere"; tried: number; unreachable: string[] }
  /** The one chain asked about is not one we can read. */
  | { kind: "unreadable-chain" }
  /** Nothing answered, so nothing can be said about the address. */
  | { kind: "unknown" };

export function lookupState(input: {
  /** What is in the address field. */
  raw: string;
  /** The resolve is in flight for the current address. */
  isLooking: boolean;
  /** The resolve failed outright (network, timeout). */
  isError: boolean;
  result: ResolvedContract | undefined;
}): LookupState {
  if (input.raw.trim().length === 0) return { kind: "idle" };
  if (toAddress(input.raw) === null) return { kind: "invalid" };
  if (input.isLooking) return { kind: "looking" };
  if (input.isError) return { kind: "unknown" };
  const { result } = input;
  if (!result) return { kind: "looking" };
  if (result.found) return { kind: "found", contract: result };
  if (result.reason === "no-code") {
    return {
      kind: "nowhere",
      tried: result.chainsTried?.length ?? 0,
      unreachable: result.chainsUnreachable ?? [],
    };
  }
  if (result.reason === "no-chain") return { kind: "unreadable-chain" };
  return { kind: "unknown" };
}

const STANDARD: Record<ResolvedContractFound["standard"], string> = {
  erc20: "token",
  erc721: "NFT collection",
  erc1155: "NFT collection",
  unknown: "contract",
};

/** "Uniswap (UNI), a token on Base" - what the address turned out to be. */
export function describeContract(c: ResolvedContractFound): string {
  const what = STANDARD[c.standard];
  const name =
    c.name && c.symbol && c.name !== c.symbol
      ? `${c.name} (${c.symbol})`
      : (c.name ?? c.symbol);
  const article = what === "NFT collection" ? "an" : "a";
  return name
    ? `${name}, ${article} ${what} on ${c.chainLabel}`
    : `${article === "an" ? "An" : "A"} ${what} on ${c.chainLabel}`;
}

/** "Ethereum, Base and Arbitrum" / "Ethereum, Base and 32 more". */
export function chainList(labels: string[], show = 3): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length <= show) {
    return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
  }
  return `${labels.slice(0, show - 1).join(", ")} and ${labels.length - (show - 1)} more`;
}
