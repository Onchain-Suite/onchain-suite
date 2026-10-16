"use client";

import {
  CheckIcon,
  ClipboardDocumentIcon,
  CubeTransparentIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import type { SupportedChain } from "@/features/settings/project-settings.service";

interface ContractRow {
  chain?: string;
  address: string;
  label?: string;
  icon?: string | null;
}

const truncateAddress = (address: string) => {
  const a = address.trim();
  if (a.length <= 16) return a;
  return `${a.slice(0, 8)}…${a.slice(-6)}`;
};

const FAMILY_BADGE: Record<string, string> = {
  evm: "bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/20",
  solana:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20",
};

function ContractRowItem({
  contract,
  chain,
}: {
  contract: ContractRow;
  chain?: SupportedChain;
}) {
  const [copied, setCopied] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);

  const label = chain?.label ?? contract.chain?.trim() ?? "Unknown";
  const testnet = chain?.testnet ?? false;
  const badgeClass =
    (chain && FAMILY_BADGE[chain.family]) ??
    "bg-muted text-muted-foreground border-border";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(contract.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-3 py-2.5 transition-colors hover:border-primary/30"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
        {contract.icon && !iconFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={contract.icon}
            alt=""
            className="h-full w-full object-contain"
            onError={() => setIconFailed(true)}
          />
        ) : (
          <CubeTransparentIcon
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-medium",
            badgeClass
          )}
        >
          {label}
        </span>
        {testnet ? (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">
            Testnet
          </span>
        ) : null}
      </span>
      <div className="min-w-0 flex-1">
        {contract.label?.trim() ? (
          <div className="truncate text-sm font-medium text-foreground">
            {contract.label}
          </div>
        ) : null}
        <div className="truncate font-mono text-xs text-muted-foreground">
          {truncateAddress(contract.address)}
        </div>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy address"
        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {copied ? (
          <CheckIcon className="h-4 w-4 text-primary" aria-hidden="true" />
        ) : (
          <ClipboardDocumentIcon className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </motion.div>
  );
}

/**
 * Renders every configured contract address as a clean, copyable list with
 * chain badges (resolved from the supported-chains registry, so testnets show a
 * tag) and the Alchemy token logo. These addresses feed the on-chain
 * intelligence / indexing pipeline.
 */
export function ContractAddressList({
  contracts,
  chains = [],
}: {
  contracts: ContractRow[];
  chains?: SupportedChain[];
}) {
  const bySlug = useMemo(() => {
    const map = new Map<string, SupportedChain>();
    for (const c of chains) {
      map.set(c.slug, c);
      for (const alias of c.aliases ?? []) map.set(alias, c);
    }
    return map;
  }, [chains]);

  const valid = contracts.filter((c) => c.address?.trim().length > 0);

  if (valid.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center">
        <CubeTransparentIcon
          className="h-6 w-6 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="mt-2 text-sm font-medium text-foreground">
          No contracts yet
        </p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Add contract addresses to index them into the on-chain intelligence
          pipeline.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {valid.map((contract) => (
        <ContractRowItem
          key={`${contract.chain ?? "?"}-${contract.address}`}
          contract={contract}
          chain={contract.chain ? bySlug.get(contract.chain) : undefined}
        />
      ))}
    </div>
  );
}

export default ContractAddressList;
