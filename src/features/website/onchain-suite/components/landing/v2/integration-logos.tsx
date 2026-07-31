/* Logo marks for the integrations grid. Brands with official assets render
   the real logo (Cloudinary, via next/image); the rest stay inline SVG until
   assets are added to the shared brand-logos map. */

import Image from "next/image";

import {
  ArbitrumLogo,
  BaseLogo,
  EthereumLogo,
  PolygonLogo,
  SolanaLogo,
} from "./chain-logos";
import {
  SERVICE_LOGO_URLS,
  WALLET_LOGO_URLS,
} from "@/shared/config/brand-logos";

type LogoProps = { size?: number };

function BrandImage({ src, size = 22 }: LogoProps & { src: string }) {
  return (
    <Image
      src={src}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="inline-block shrink-0 rounded-[5px] object-contain"
    />
  );
}

function Frame({
  size = 22,
  bg,
  children,
  rounded = 6,
}: {
  size?: number;
  bg?: string;
  rounded?: number;
  children: React.ReactNode;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      {bg ? <rect width="32" height="32" rx={rounded} fill={bg} /> : null}
      {children}
    </svg>
  );
}

function DynamicLogo({ size }: LogoProps) {
  return (
    <Frame size={size} bg="#E9ECFF" rounded={9}>
      <circle
        cx="16"
        cy="16"
        r="8"
        fill="none"
        stroke="#5B4DEE"
        strokeWidth="2.4"
      />
      <circle cx="16" cy="16" r="3" fill="#5B4DEE" />
    </Frame>
  );
}

function WebhookLogo({ size }: LogoProps) {
  return (
    <Frame size={size} bg="#EAF1FB" rounded={9}>
      <circle cx="12.5" cy="12" r="2.4" fill="#1727E0" />
      <circle cx="20.5" cy="18.5" r="2.4" fill="#1727E0" />
      <circle cx="11" cy="20.5" r="2.4" fill="#1727E0" />
      <path
        d="M12.5 12.5 9 18.5M20 18.5h-7M13.5 11.5l5.5 5.5"
        stroke="#1727E0"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </Frame>
  );
}

export type Integration = {
  name: string;
  Logo: (p: LogoProps) => React.JSX.Element;
};

export const INTEGRATIONS: Integration[] = [
  {
    name: "MetaMask",
    Logo: (p) => <BrandImage src={WALLET_LOGO_URLS.metamask} size={p.size} />,
  },
  {
    name: "Phantom",
    Logo: (p) => <BrandImage src={WALLET_LOGO_URLS.phantom} size={p.size} />,
  },
  {
    name: "WalletConnect",
    Logo: (p) => (
      <BrandImage src={WALLET_LOGO_URLS.walletconnect} size={p.size} />
    ),
  },
  {
    name: "Rabby",
    Logo: (p) => <BrandImage src={WALLET_LOGO_URLS.rabby} size={p.size} />,
  },
  { name: "Ethereum", Logo: (p) => <EthereumLogo size={p.size} /> },
  { name: "Solana", Logo: (p) => <SolanaLogo size={p.size} /> },
  { name: "Base", Logo: (p) => <BaseLogo size={p.size} /> },
  { name: "Polygon", Logo: (p) => <PolygonLogo size={p.size} /> },
  { name: "Arbitrum", Logo: (p) => <ArbitrumLogo size={p.size} /> },
  {
    name: "Discord",
    Logo: (p) => <BrandImage src={SERVICE_LOGO_URLS.discord} size={p.size} />,
  },
  {
    name: "Telegram",
    Logo: (p) => <BrandImage src={SERVICE_LOGO_URLS.telegram} size={p.size} />,
  },
  {
    name: "Dune",
    Logo: (p) => <BrandImage src={SERVICE_LOGO_URLS.dune} size={p.size} />,
  },
  {
    name: "Privy",
    Logo: (p) => <BrandImage src={SERVICE_LOGO_URLS.privy} size={p.size} />,
  },
  { name: "Dynamic", Logo: DynamicLogo },
  { name: "Webhooks", Logo: WebhookLogo },
];
