/* Chain & protocol logo marks. Chains with official brand assets render the
   real logo (Cloudinary, via next/image); niche protocol marks stay inline
   SVG until official assets are added to the shared brand-logos map. */

import Image from "next/image";

import { CHAIN_LOGO_URLS } from "@/shared/config/brand-logos";

type LogoProps = { size?: number; className?: string };

function BrandImage({
  src,
  size = 18,
  className,
}: LogoProps & { src: string }) {
  return (
    <Image
      src={src}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`inline-block shrink-0 object-contain ${className ?? ""}`}
    />
  );
}

export function EthereumLogo(props: LogoProps) {
  return <BrandImage src={CHAIN_LOGO_URLS.ethereum} {...props} />;
}

export function SolanaLogo(props: LogoProps) {
  return <BrandImage src={CHAIN_LOGO_URLS.solana} {...props} />;
}

export function BaseLogo(props: LogoProps) {
  return <BrandImage src={CHAIN_LOGO_URLS.base} {...props} />;
}

export function PolygonLogo(props: LogoProps) {
  return <BrandImage src={CHAIN_LOGO_URLS.polygon} {...props} />;
}

export function OptimismLogo({ size = 18, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="12" fill="#FF0420" />
      <path
        fill="#fff"
        d="M8.1 15.2c-.9 0-1.6-.2-2.2-.6-.5-.5-.8-1.1-.8-1.9 0-.2 0-.4.1-.6.1-.7.3-1.5.6-2.5.7-2.7 2.5-4 5.3-4 .8 0 1.5.1 2.1.4.6.3 1 .6 1.4 1.1.3.5.5 1.1.5 1.8 0 .2 0 .4-.1.6-.3 1.3-.5 2.1-.6 2.5-.7 2.7-2.5 4-5.3 4l-.7-.3zm.2-2.1c.5 0 .9-.1 1.3-.4.4-.3.6-.8.8-1.4.2-.9.4-1.6.5-2.1.1-.2.1-.4.1-.7 0-.8-.4-1.2-1.3-1.2-.5 0-1 .2-1.3.5-.4.3-.6.7-.8 1.4-.2.7-.4 1.4-.5 2.1-.1.2-.1.4-.1.6 0 .8.4 1.2 1.1 1.2l.2-.6zm6.5 2c-.1 0-.1 0-.2-.1l-.1-.2 1.4-6.4c0-.1.1-.1.1-.2l.2-.1h2.6c.7 0 1.3.2 1.7.5.5.3.7.8.7 1.4 0 .2 0 .4-.1.5-.2.8-.5 1.4-1.1 1.8-.5.4-1.3.6-2.2.6h-1.3l-.5 2.1c0 .1-.1.1-.1.2l-.2.1-1 .3zm3.1-3.8c.3 0 .6-.1.8-.3.2-.2.4-.4.4-.7v-.3c0-.2-.1-.3-.2-.4l-.5-.1h-1.2l-.4 1.9 1.1.1-.1-.2.6.3z"
      />
    </svg>
  );
}

export function ArbitrumLogo(props: LogoProps) {
  return <BrandImage src={CHAIN_LOGO_URLS.arbitrum} {...props} />;
}

export function JupiterLogo({ size = 18, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="11" fill="#16C2C2" />
      <circle
        cx="12"
        cy="12"
        r="6.5"
        fill="none"
        stroke="#022"
        strokeOpacity=".25"
        strokeWidth="1.4"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="11"
        ry="3.4"
        fill="none"
        stroke="#C8F9F2"
        strokeWidth="1.4"
        transform="rotate(-25 12 12)"
      />
      <circle cx="9.2" cy="9.6" r="1.5" fill="#063" fillOpacity=".4" />
    </svg>
  );
}

export function AerodromeLogo({ size = 18, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="12" fill="#1a1a2e" />
      <path fill="#3DF5C8" d="M12 4.5 5 19.5h3.1L12 10.7l3.9 8.8H19z" />
      <path fill="#3DF5C8" d="M9.4 14.8h5.2l1.1 2.6H8.3z" />
    </svg>
  );
}

/** Generic governance / ballot mark (used for "Governance · Ethereum"). */
export function GovernanceLogo({ size = 18, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="12" fill="#627EEA" />
      <path fill="#fff" d="M6 7h12v2H6zm0 4h12v2H6zm0 4h8v2H6z" opacity=".95" />
    </svg>
  );
}

export type ChainKey =
  | "ethereum"
  | "solana"
  | "base"
  | "polygon"
  | "optimism"
  | "arbitrum"
  | "jupiter"
  | "aerodrome"
  | "governance";

export const CHAIN_LOGO: Record<
  ChainKey,
  (props: LogoProps) => React.JSX.Element
> = {
  ethereum: EthereumLogo,
  solana: SolanaLogo,
  base: BaseLogo,
  polygon: PolygonLogo,
  optimism: OptimismLogo,
  arbitrum: ArbitrumLogo,
  jupiter: JupiterLogo,
  aerodrome: AerodromeLogo,
  governance: GovernanceLogo,
};

export function ChainLogo({
  chain,
  size = 18,
  className,
}: {
  chain: ChainKey;
  size?: number;
  className?: string;
}) {
  const C = CHAIN_LOGO[chain];
  return <C size={size} className={className} />;
}
