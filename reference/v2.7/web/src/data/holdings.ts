/* What a wallet holds and touches (2.7).
 *
 * The audience table described how we can reach a contact — tags, channels, lifetime — and
 * nothing about what they actually do on-chain. Tags were the worst offender: they are our
 * own labels, so a column of them tells you what you already decided rather than anything
 * about the wallet. Chains, apps and tokens are facts we index, and they are what someone
 * scanning the list is trying to read: is this a Base-native DeFi wallet or an Ethereum
 * holder who has never touched an app.
 *
 * Each mark carries a colour and a short label because a row of identical grey circles is
 * decoration. The overflow count is deliberate — showing three and "+4" is honest about
 * there being more, where truncating silently is not. */

export interface Mark {
  id: string;
  label: string;
  /** Two or three characters — the fallback when there is no real mark. */
  short: string;
  color: string;
  /** Export name in @web3icons/react. Absent means draw the letter. */
  mark?: string;
}

/* Real marks, not letters (2.7).
 *
 * These started as coloured circles with initials, which is what you draw when you have no
 * logos. Scanning a wallet list is pattern recognition — you are looking for "Base + Aave"
 * shapes, not reading — and initials make it reading. @web3icons carries the actual network
 * and token marks, so `mark` names one and the letter is only a fallback.
 *
 * The demo protocols moved to ones the pack actually covers. A row mixing three real logos
 * with two hand-drawn approximations looks like a bug, and picking Uniswap over Aerodrome
 * costs a mock nothing. The one deliberate exception is the workspace's own token: nobody's
 * in-house token is in a public icon pack, so VAULT keeps its lettered mark — which is what a
 * real customer's own token would do here too.
 */
export const CHAIN_MARKS: Mark[] = [
  { id: 'base', label: 'Base', short: 'B', color: '#0052FF', mark: 'NetworkBase' },
  { id: 'ethereum', label: 'Ethereum', short: 'E', color: '#627EEA', mark: 'NetworkEthereum' },
  { id: 'arbitrum', label: 'Arbitrum', short: 'A', color: '#12AAFF', mark: 'NetworkArbitrumOne' },
  { id: 'optimism', label: 'Optimism', short: 'O', color: '#FF0420', mark: 'NetworkOptimism' },
  { id: 'polygon', label: 'Polygon', short: 'P', color: '#8247E5', mark: 'NetworkPolygon' },
];

export const APP_MARKS: Mark[] = [
  { id: 'uniswap', label: 'Uniswap', short: 'Un', color: '#FF007A', mark: 'TokenUNI' },
  { id: 'aave', label: 'Aave', short: 'Aa', color: '#B6509E', mark: 'TokenAAVE' },
  { id: 'lido', label: 'Lido', short: 'Li', color: '#00A3FF', mark: 'TokenLDO' },
  { id: 'curve', label: 'Curve', short: 'Cv', color: '#3465A3', mark: 'TokenCRV' },
  { id: 'compound', label: 'Compound', short: 'Cp', color: '#00D395', mark: 'TokenCOMP' },
  { id: 'pendle', label: 'Pendle', short: 'Pe', color: '#2D3F8C', mark: 'TokenPENDLE' },
];

export const TOKEN_MARKS: Mark[] = [
  { id: 'usdc', label: 'USDC', short: '$', color: '#2775CA', mark: 'TokenUSDC' },
  { id: 'weth', label: 'ETH', short: 'E', color: '#627EEA', mark: 'TokenETH' },
  // The workspace's own token — no pack has it, so it keeps the lettered mark on purpose.
  { id: 'vault', label: 'VAULT', short: 'V', color: '#4F46E5' },
  { id: 'degen', label: 'DEGEN', short: 'D', color: '#A36EFD', mark: 'TokenDEGEN' },
  { id: 'cbeth', label: 'cbETH', short: 'cb', color: '#0052FF', mark: 'TokenCBETH' },
  { id: 'usdt', label: 'USDT', short: 'T', color: '#26A17B', mark: 'TokenUSDT' },
];

const byId = (pool: Mark[]) => (ids: string[]) => ids.map((id) => pool.find((m) => m.id === id)).filter(Boolean) as Mark[];
export const chainMarks = byId(CHAIN_MARKS);
export const appMarks = byId(APP_MARKS);
export const tokenMarks = byId(TOKEN_MARKS);

/** Deterministic holdings for a contact index. A real backend reads these from the indexer;
 *  here they are derived so the same wallet always shows the same thing. */
export function holdingsFor(i: number, hasWallet: boolean): { chains: string[]; apps: string[]; tokens: string[] } {
  if (!hasWallet) return { chains: [], apps: [], tokens: [] };
  /* Walk the pool from an offset, one step at a time, and stop at the end of it.
     A strided walk repeats whenever the stride shares a factor with the pool length — six
     apps with a stride of three only ever visits two of them — and a skip-what-you-have
     version of that never terminates. Bounding the walk by the pool length makes both
     failures impossible: every pick is distinct, and it always finishes. */
  const take = (pool: Mark[], n: number, off: number): Mark[] => {
    const out: Mark[] = [];
    for (let k = 0; k < pool.length && out.length < n; k += 1) out.push(pool[(off + k) % pool.length]);
    return out;
  };

  const nChains = 1 + (i % 3);
  // Plenty of wallets hold tokens and have never used an app — the dash in that column is
  // information, not a gap in the data.
  const nApps = i % 4 === 1 ? 0 : 1 + (i % 3);
  const nTokens = 1 + (i % 5);
  return {
    chains: take(CHAIN_MARKS, nChains, i).map((m) => m.id),
    apps: take(APP_MARKS, nApps, i + 1).map((m) => m.id),
    tokens: take(TOKEN_MARKS, nTokens, i + 2).map((m) => m.id),
  };
}
