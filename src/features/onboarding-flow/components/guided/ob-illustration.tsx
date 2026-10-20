"use client";

import {
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  HashtagIcon,
  PaperAirplaneIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

import {
  type ChainKey,
  ChainLogo,
} from "@/onchain-suite-website/components/landing/v2/chain-logos";

/**
 * The pane beside the question: a quiet but complete picture of what the product does, with
 * wallets turned into contacts, the channels they are reachable on, a campaign going out and the
 * numbers coming back - emails, contacts, social and audience in one frame. The region the
 * current step affects is lifted slightly; the rest stays calm, because the question is what
 * should be asking for attention. All decorative, so the whole aside is aria-hidden.
 */
export type IllustrationLit =
  "workspace" | "audience" | "channels" | "charts" | "none";

const AUDIENCE: { name: string; chain: ChainKey; via: string }[] = [
  { name: "vitalik.eth", chain: "ethereum", via: "Email" },
  { name: "punk6529", chain: "base", via: "In-app" },
  { name: "cobie.eth", chain: "arbitrum", via: "Farcaster" },
];

const CHANNELS: { label: string; icon: typeof EnvelopeIcon }[] = [
  { label: "Email", icon: EnvelopeIcon },
  { label: "In-app", icon: DevicePhoneMobileIcon },
  { label: "Discord", icon: ChatBubbleLeftRightIcon },
  { label: "Telegram", icon: PaperAirplaneIcon },
  { label: "Farcaster", icon: HashtagIcon },
];

const BARS = [42, 58, 50, 72, 64, 85, 78, 96];

const ring = (on: boolean) =>
  on ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-card" : "";

export function ObIllustration({ lit }: { lit: IllustrationLit }) {
  return (
    <aside aria-hidden className="relative hidden lg:block">
      {/* Soft brand wash behind the card, for depth. */}
      <div className="pointer-events-none absolute -inset-8 -z-10">
        <div className="bg-primary/15 absolute right-6 top-10 h-48 w-48 rounded-full blur-3xl" />
        <div className="bg-primary/10 absolute bottom-6 left-0 h-40 w-40 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-sm">
        {/* Main product frame */}
        <div className="bg-card overflow-hidden rounded-2xl border border-border shadow-[0_30px_80px_-40px_rgba(23,39,224,0.45)]">
          {/* Window chrome */}
          <div className="bg-muted/40 flex items-center gap-2 border-b border-border px-4 py-2.5">
            <span className="bg-primary/30 h-2.5 w-2.5 rounded-full" />
            <span className="bg-primary/20 h-2.5 w-2.5 rounded-full" />
            <span className="bg-primary/10 h-2.5 w-2.5 rounded-full" />
            <span className="text-muted-foreground ml-1.5 text-[11px] font-medium">
              Onchain Suite
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="bg-primary/40 absolute inline-flex h-full w-full animate-ping rounded-full" />
                <span className="bg-primary relative inline-flex h-2 w-2 rounded-full" />
              </span>
              <span className="text-muted-foreground text-[10px]">Live</span>
            </span>
          </div>

          <div className="space-y-4 p-4">
            {/* Reachable-audience stat */}
            <div
              className={`rounded-xl border border-border p-3 transition-all ${ring(
                lit === "audience"
              )}`}
            >
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

              {/* Wallet -> contact rows */}
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

            {/* Channels the audience is reachable on */}
            <div
              className={`rounded-xl border border-border p-3 transition-all ${ring(
                lit === "channels"
              )}`}
            >
              <p className="text-muted-foreground mb-2 text-[11px] font-medium">
                One trigger, every channel
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CHANNELS.map((c) => (
                  <span
                    key={c.label}
                    className="bg-muted/60 text-foreground flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium"
                  >
                    <c.icon
                      aria-hidden="true"
                      className="text-primary h-3.5 w-3.5"
                    />
                    {c.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Campaign performance */}
            <div
              className={`rounded-xl border border-border p-3 transition-all ${ring(
                lit === "charts"
              )}`}
            >
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
          </div>
        </div>

        {/* Floating campaign chip */}
        <div
          className={`bg-card absolute -right-4 -top-4 flex items-center gap-2 rounded-xl border border-border px-3 py-2 shadow-lg ${ring(
            lit === "workspace"
          )}`}
        >
          <span className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-lg">
            <EnvelopeIcon aria-hidden="true" className="h-4 w-4" />
          </span>
          <span>
            <span className="text-foreground block text-[11px] font-semibold leading-tight">
              Welcome onchain
            </span>
            <span className="text-muted-foreground block text-[10px] leading-tight">
              Sent to 1,842 wallets
            </span>
          </span>
        </div>

        {/* Floating insight chip */}
        <div className="bg-card absolute -bottom-4 -left-4 flex items-center gap-2 rounded-xl border border-border px-3 py-2 shadow-lg">
          <span className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-lg">
            <SparklesIcon aria-hidden="true" className="h-4 w-4" />
          </span>
          <span className="text-foreground text-[11px] font-medium">
            312 wallets minted twice
          </span>
        </div>
      </div>
    </aside>
  );
}
