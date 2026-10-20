"use client";

import { BoltIcon } from "@heroicons/react/24/outline";

import { FloatingChip, IllustrationShell } from "./illustration-frame";
import {
  type ChainKey,
  ChainLogo,
} from "@/onchain-suite-website/components/landing/v2/chain-logos";

const CHAINS: ChainKey[] = ["ethereum", "base", "arbitrum"];
const EVENTS: { name: string; count: string }[] = [
  { name: "Transfer", count: "842k" },
  { name: "Mint", count: "126k" },
  { name: "Staked", count: "38k" },
];

/** Step 4 scene: the contract indexed, its events turning onchain activity into triggers. */
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
      <div className="rounded-xl border border-border p-3">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-[11px] font-medium">
            Smart contract
          </p>
          <span className="flex items-center gap-1">
            {CHAINS.map((c) => (
              <span
                key={c}
                className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-white"
              >
                <ChainLogo chain={c} size={12} />
              </span>
            ))}
          </span>
        </div>
        <p className="text-foreground mt-1 font-mono text-xs">0x1a2b…9f3e</p>

        <div className="mt-3 space-y-1.5">
          {EVENTS.map((e) => (
            <div
              key={e.name}
              className="bg-background flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5"
            >
              <span className="bg-primary/10 text-primary flex h-5 w-5 items-center justify-center rounded">
                <BoltIcon aria-hidden className="h-3 w-3" />
              </span>
              <span className="text-foreground flex-1 text-sm font-medium">
                {e.name}
              </span>
              <span className="text-muted-foreground font-mono text-[11px]">
                {e.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-muted-foreground text-[11px] font-medium">
            Indexing
          </p>
          <span className="text-foreground text-[11px] font-semibold">
            1.2M events
          </span>
        </div>
        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
          <span className="bg-primary block h-full w-4/5 rounded-full" />
        </div>
      </div>
    </IllustrationShell>
  );
}
