import type { IconComponentProps } from '@web3icons/react';
import type { ComponentType } from 'react';
import NetworkBase from '@web3icons/react/icons/networks/NetworkBase';
import NetworkEthereum from '@web3icons/react/icons/networks/NetworkEthereum';
import NetworkArbitrumOne from '@web3icons/react/icons/networks/NetworkArbitrumOne';
import NetworkOptimism from '@web3icons/react/icons/networks/NetworkOptimism';
import NetworkPolygon from '@web3icons/react/icons/networks/NetworkPolygon';
import TokenUNI from '@web3icons/react/icons/tokens/TokenUNI';
import TokenAAVE from '@web3icons/react/icons/tokens/TokenAAVE';
import TokenLDO from '@web3icons/react/icons/tokens/TokenLDO';
import TokenCRV from '@web3icons/react/icons/tokens/TokenCRV';
import TokenCOMP from '@web3icons/react/icons/tokens/TokenCOMP';
import TokenPENDLE from '@web3icons/react/icons/tokens/TokenPENDLE';
import TokenUSDC from '@web3icons/react/icons/tokens/TokenUSDC';
import TokenETH from '@web3icons/react/icons/tokens/TokenETH';
import TokenDEGEN from '@web3icons/react/icons/tokens/TokenDEGEN';
import TokenCBETH from '@web3icons/react/icons/tokens/TokenCBETH';
import TokenUSDT from '@web3icons/react/icons/tokens/TokenUSDT';
import type { Mark } from '../data/holdings';

/* The seventeen marks we actually use, imported by name.
 *
 * This was a lazy `import('@web3icons/react')` resolved by string, which looks like the
 * frugal option and is the opposite: the package root is a barrel over 2,000 icons, so every
 * one of them landed in a single chunk — 12.3MB, 3.8MB gzipped, for seventeen logos. A
 * dynamic import cannot tree-shake, because the bundler has to assume any name might be asked
 * for at runtime.
 *
 * Naming them makes the set static, and the bundler ships exactly these. The cost is that
 * adding a protocol means adding a line here, which is the right trade at this size and the
 * reason the map lives beside the mark data rather than being derived from it.
 */
const MARKS: Record<string, ComponentType<IconComponentProps>> = {
  NetworkBase, NetworkEthereum, NetworkArbitrumOne, NetworkOptimism, NetworkPolygon,
  TokenUNI, TokenAAVE, TokenLDO, TokenCRV, TokenCOMP, TokenPENDLE,
  TokenUSDC, TokenETH, TokenDEGEN, TokenCBETH, TokenUSDT,
};

function Letter({ m, size }: { m: Mark; size: number }) {
  return (
    <i className="mstack__m" style={{ background: m.color, width: size, height: size }} aria-hidden="true">{m.short}</i>
  );
}

export function Web3Mark({ mark, size = 20 }: { mark: Mark; size?: number }) {
  const Cmp = mark.mark ? MARKS[mark.mark] : undefined;
  /* No mark is not a failure: the workspace's own token will never be in a public pack, and
     the lettered circle is the correct answer for it. */
  if (!Cmp) return <Letter m={mark} size={size} />;
  return (
    <span className="mstack__logo" style={{ width: size, height: size }} aria-hidden="true">
      {/* "background" rather than "branded": these sit in a row of overlapping circles, and the
          branded variants are whatever shape each brand uses, which made the stack look broken. */}
      <Cmp size={size} variant="background" />
    </span>
  );
}
