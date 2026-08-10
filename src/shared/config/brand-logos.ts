/**
 * Official brand logo assets (Cloudinary-hosted) for chains, wallets, and
 * integrated services. Single source of truth - use these instead of
 * hand-drawn SVG approximations wherever a real brand mark should render.
 */

export const CHAIN_LOGO_URLS = {
  ethereum:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1783871951/Ethereum_Logo_1_q5hxhr.png",
  solana:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1783871813/Solana_idwf70r6dl_1_mxh5vw.png",
  base: "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1783871536/Base_square_blue_iryofk.png",
  polygon:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1783871505/polygon-icon-primary-purple_omxayc.svg",
  arbitrum:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1783871593/1225_Arbitrum_Logomark_FullColor_ClearSpace_qyvmbk.png",
} as const;

export type ChainLogoKey = keyof typeof CHAIN_LOGO_URLS;

export const WALLET_LOGO_URLS = {
  metamask:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1783871884/MetaMask_Symbol_1_qrepbn.png",
  phantom:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1783871867/Phantom_Symbol_1_lrpvrg.png",
  walletconnect:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1783871908/Icon_j52r6j.svg",
  rabby:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1783871847/Rabby_Wallet_idGTuZs5w6_3_v6lkzi.jpg",
} as const;

export type WalletLogoKey = keyof typeof WALLET_LOGO_URLS;

export const SERVICE_LOGO_URLS = {
  discord:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1783871927/Discord_idBHgAk9_3_1_oemx2y.png",
  telegram:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1783871798/Telegram_Symbol_1_rbvd17.png",
  dune: "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1783869947/Dune_Icon_1x1_Light_rcinmn.svg",
  privy:
    "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1783869926/Privy-square_vi9z1j.svg",
} as const;

export type ServiceLogoKey = keyof typeof SERVICE_LOGO_URLS;

/**
 * Resolve a chain identifier as it appears in API data (`eth-mainnet`,
 * `base-mainnet`, `Polygon`, `SOL`, …) to its logo URL, or null when the
 * chain has no official asset yet.
 */
export function getChainLogoUrl(chain: string): string | null {
  const normalized = chain.trim().toLowerCase();
  if (normalized.startsWith("eth") || normalized === "mainnet") {
    return CHAIN_LOGO_URLS.ethereum;
  }
  if (normalized.startsWith("sol")) return CHAIN_LOGO_URLS.solana;
  if (normalized.startsWith("base")) return CHAIN_LOGO_URLS.base;
  if (normalized.startsWith("polygon") || normalized.startsWith("matic")) {
    return CHAIN_LOGO_URLS.polygon;
  }
  if (normalized.startsWith("arb")) return CHAIN_LOGO_URLS.arbitrum;
  return null;
}
