"use client";

import {
  AtSymbolIcon,
  ChatBubbleLeftRightIcon,
  ChatBubbleOvalLeftIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  HashtagIcon,
  PaperAirplaneIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

import { FloatingChip, IllustrationShell } from "./illustration-frame";
import {
  type ChainKey,
  ChainLogo,
} from "@/onchain-suite-website/components/landing/v2/chain-logos";

const AUDIENCE: { name: string; chain: ChainKey; via: string }[] = [
  { name: "vitalik.eth", chain: "ethereum", via: "Email" },
  { name: "punk6529", chain: "base", via: "In-app" },
  { name: "cobie.eth", chain: "arbitrum", via: "Farcaster" },
];

const CHANNELS: { label: string; icon: typeof EnvelopeIcon }[] = [
  { label: "Email", icon: EnvelopeIcon },
  { label: "In-app", icon: DevicePhoneMobileIcon },
  { label: "X", icon: AtSymbolIcon },
  { label: "WhatsApp", icon: ChatBubbleOvalLeftIcon },
  { label: "Telegram", icon: PaperAirplaneIcon },
  { label: "Discord", icon: ChatBubbleLeftRightIcon },
  { label: "Farcaster", icon: HashtagIcon },
];

const BARS = [42, 58, 50, 72, 64, 85, 78, 96];

/** Step 1 scene: the whole product at a glance - wallets as contacts, every channel, a campaign. */
export function SceneProject() {
  return (
    <IllustrationShell
      chips={
        <>
          <FloatingChip
            className="-right-4 -top-4"
            icon={EnvelopeIcon}
            title="Welcome onchain"
            subtitle="Sent to 1,842 wallets"
          />
          <FloatingChip
            className="-bottom-4 -left-4"
            icon={SparklesIcon}
            title="312 wallets minted twice"
          />
        </>
      }
    >
      <div className="rounded-xl border border-border p-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-muted-foreground text-[11px] font-medium">
              Reachable audience
            </p>
            <p className="text-foreground text-2xl font-extrabold leading-tight">
              1,842
            </p>
          </div>
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px] font-semibold">
            +12% this week
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {AUDIENCE.map((r) => (
            <div
              key={r.name}
              className="bg-background flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-1.5"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-white">
                <ChainLogo chain={r.chain} size={15} />
              </span>
              <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                {r.name}
              </span>
              <span className="border-primary/20 bg-primary/5 text-primary rounded-full border px-2 py-0.5 text-[10px] font-medium">
                {r.via}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border p-3">
        <p className="text-muted-foreground mb-2 text-[11px] font-medium">
          One trigger, every channel
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CHANNELS.map((c) => (
            <span
              key={c.label}
              className="bg-muted/60 text-foreground flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium"
            >
              <c.icon aria-hidden className="text-primary h-3.5 w-3.5" />
              {c.label}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-muted-foreground text-[11px] font-medium">
            Campaign performance
          </p>
          <span className="text-foreground text-[11px] font-semibold">
            48% open
          </span>
        </div>
        <div className="flex h-16 items-end gap-1.5">
          {BARS.map((h, i) => (
            <span
              key={h}
              style={{ height: `${h}%` }}
              className={`flex-1 rounded-t ${
                i === BARS.length - 1 ? "bg-primary" : "bg-primary/40"
              }`}
            />
          ))}
        </div>
      </div>
    </IllustrationShell>
  );
}
