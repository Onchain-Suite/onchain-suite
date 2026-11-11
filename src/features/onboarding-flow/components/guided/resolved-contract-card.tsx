import { CheckmarkBadge01Icon } from "@hugeicons/core-free-icons";

import type {
  ChainRef,
  ResolvedContractFound,
} from "../../contracts/resolve-contract";
import { Icon } from "@/shared/components/common/hugeicon";

const STANDARD_LABEL: Record<string, string> = {
  erc20: "ERC-20 token",
  erc721: "ERC-721 NFT",
  erc1155: "ERC-1155 NFT",
  unknown: "Contract",
};

/** A confirmed, on-chain contract: the honest result, verified against the chain. */
export function ResolvedContractCard({
  contract,
  onPickChain,
}: {
  contract: ResolvedContractFound;
  /** Read the address on another chain it is also deployed on. */
  onPickChain: (chain: ChainRef) => void;
}) {
  const title =
    contract.name ??
    (contract.symbol ? `$${contract.symbol}` : "Verified contract");
  const where = contract.chainLabel
    ? `Verified on ${contract.chainLabel}`
    : "Verified on-chain";
  return (
    <div className="border-primary/40 bg-primary/5 rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <span className="bg-background border-border flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
          {contract.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={contract.logo}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <Icon icon={CheckmarkBadge01Icon} className="text-primary size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-foreground text-sm font-semibold">
              {title}
            </span>
            {contract.symbol && contract.name ? (
              <span className="text-muted-foreground font-mono text-xs">
                {contract.symbol}
              </span>
            ) : null}
            <span className="border-primary/30 text-primary inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium">
              <Icon icon={CheckmarkBadge01Icon} className="size-3" />
              {where}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {STANDARD_LABEL[contract.standard] ?? "Contract"}
            {" · "}
            <span className="font-mono">
              {`${contract.address.slice(0, 8)}…${contract.address.slice(-6)}`}
            </span>
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            We start indexing this contract and its events when you continue.
          </p>
          {contract.alsoOn.length > 0 ? (
            <p className="text-muted-foreground mt-2 text-xs">
              The same address is also on{" "}
              {contract.alsoOn.map((ref, i) => (
                <span key={ref.chain}>
                  {i > 0 ? ", " : null}
                  <button
                    type="button"
                    onClick={() => onPickChain(ref)}
                    className="text-primary font-medium underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    {ref.chainLabel}
                  </button>
                </span>
              ))}
              . Pick one if that is the one you mean.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
