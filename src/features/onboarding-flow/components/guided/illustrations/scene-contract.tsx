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
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs font-medium">
            Smart contract
          </p>
          <span className="flex items-center gap-1.5">
            {CHAINS.map((c) => (
              <span
                key={c}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white"
              >
                <ChainLogo chain={c} size={14} />
              </span>
            ))}
          </span>
        </div>
        <p className="text-foreground mt-1.5 font-mono text-sm">0x1a2b…9f3e</p>

        <div className="mt-3.5 space-y-2">
          {EVENTS.map((e) => (
            <div
              key={e.name}
              className="bg-background flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
            >
              <span className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-md">
                <BoltIcon aria-hidden className="h-3.5 w-3.5" />
              </span>
              <span className="text-foreground flex-1 text-base font-medium">
                {e.name}
              </span>
              <span className="text-muted-foreground font-mono text-xs">
                {e.count}
              </span>
            </div>
          ))}
        </div>
      </div>

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
