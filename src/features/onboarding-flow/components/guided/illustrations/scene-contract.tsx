"use client";

import { BoltIcon, CheckBadgeIcon } from "@heroicons/react/24/outline";

import { FloatingChip, IllustrationShell } from "./illustration-frame";
import {
  type ChainKey,
  ChainLogo,
} from "@/onchain-suite-website/components/landing/v2/chain-logos";

const CHAINS: ChainKey[] = ["ethereum", "base", "arbitrum"];
const EVENTS: { name: string; sub: string; count: string }[] = [
  { name: "Transfer", sub: "Holder movements", count: "842k" },
  { name: "Mint", sub: "New holders", count: "126k" },
  { name: "Staked", sub: "Committed wallets", count: "38k" },
];

/** Step 4 scene: a contract read off the chain, verified, its events turning into triggers. */
export function SceneContract() {
  return (
    <IllustrationShell
      wide
      chips={
        <FloatingChip
          className="-bottom-4 -left-4"
          icon={BoltIcon}
          title="312 wallets matched"
          subtitle="minted twice"
        />
      }
    >
      {/* Verified contract header */}
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center gap-3">
          <span className="from-primary/20 to-primary/5 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br">
            <BoltIcon aria-hidden className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-foreground truncate text-sm font-semibold">
                Pack Vault
              </span>
              <span className="text-muted-foreground font-mono text-xs">
                PACK
              </span>
            </div>
            <span className="text-primary mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium">
              <CheckBadgeIcon aria-hidden className="h-3.5 w-3.5" />
              Verified on Base
            </span>
          </div>
          <span className="flex items-center -space-x-1.5">
            {CHAINS.map((c) => (
              <ChainLogo
                key={c}
                chain={c}
                size={22}
                className="ring-card rounded-full ring-2"
              />
            ))}
          </span>
        </div>
        <p className="text-muted-foreground mt-3 font-mono text-xs">
          0x1a2b…9f3e
        </p>
      </div>

      {/* Events being indexed */}
      <div className="rounded-xl border border-border p-4">
        <p className="text-muted-foreground mb-3 text-xs font-medium">
          Events tracked
        </p>
        <div className="space-y-2">
          {EVENTS.map((e) => (
            <div
              key={e.name}
              className="bg-background flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
            >
              <span className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
                <BoltIcon aria-hidden className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-foreground block text-sm font-medium">
                  {e.name}
                </span>
                <span className="text-muted-foreground block text-[11px]">
                  {e.sub}
                </span>
              </span>
              <span className="text-muted-foreground font-mono text-xs">
                {e.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Indexing progress */}
      <div className="rounded-xl border border-border p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-muted-foreground text-xs font-medium">Indexing</p>
          <span className="text-foreground text-xs font-semibold">
            1.2M events
          </span>
        </div>
        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
          <span className="bg-primary block h-full w-4/5 rounded-full" />
        </div>
      </div>
    </IllustrationShell>
  );
}
