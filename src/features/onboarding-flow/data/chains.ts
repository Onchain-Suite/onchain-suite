/**
 * Chains the onboarding contract picker offers (v2 revamp).
 *
 * Interim: this is a frontend list. It should be replaced by the backend's `GET /chains` once that
 * lands (see docs/onboarding-v2-backend-handoff.md), so the picker and the chain keys we send to
 * the indexer stay in lockstep with what the backend actually supports. The `key` is what we send
 * (it matches the `chainHint` shape from suggest-contracts, e.g. "eth-mainnet").
 */

import { type ChainKey } from "@/onchain-suite-website/components/landing/v2/chain-logos";

export interface SupportedChain {
  /** Backend chain key sent to the indexer / resolver. */
  key: string;
  label: string;
  /** ChainLogo key when we have a mark for it. */
  logo?: ChainKey;
}

export const SUPPORTED_CHAINS: SupportedChain[] = [
  { key: "eth-mainnet", label: "Ethereum", logo: "ethereum" },
  { key: "base-mainnet", label: "Base", logo: "base" },
  { key: "arbitrum-mainnet", label: "Arbitrum", logo: "arbitrum" },
  { key: "optimism-mainnet", label: "Optimism", logo: "optimism" },
  { key: "polygon-mainnet", label: "Polygon", logo: "polygon" },
  { key: "solana-mainnet", label: "Solana", logo: "solana" },
  { key: "bnb-mainnet", label: "BNB Chain" },
  { key: "avalanche-mainnet", label: "Avalanche" },
];

export const DEFAULT_CHAIN = SUPPORTED_CHAINS[0].key;

const CHAIN_BY_KEY = new Map(SUPPORTED_CHAINS.map((c) => [c.key, c]));

/** Resolve a chain key (or a loose suggest-contracts chainHint) to a known chain, else undefined. */
export const chainByKey = (key: string): SupportedChain | undefined => {
  if (CHAIN_BY_KEY.has(key)) return CHAIN_BY_KEY.get(key);
  const lower = key.toLowerCase();
  return SUPPORTED_CHAINS.find(
    (c) => c.key.toLowerCase() === lower || c.label.toLowerCase() === lower
  );
};
