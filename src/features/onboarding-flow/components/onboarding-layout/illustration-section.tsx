import {
  ArrowTrendingUpIcon,
  BoltIcon,
  ClockIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";

import {
  type ChainKey,
  ChainLogo,
} from "@/onchain-suite-website/components/landing/v2/chain-logos";

interface IllustrationSectionProps {
  currentStep: number;
}

/** A framed "app window" the illustrations sit inside, for a product feel. */
function Frame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-[340px] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_-40px_rgba(23,39,224,0.35)]">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-primary/30" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary/10" />
        <span className="ml-2 text-[11px] font-medium text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="p-5 text-left">{children}</div>
    </div>
  );
}

/** Turn wallets into a reachable audience. Uses real chain/protocol logos
 *  (swap for your own protocols later). */
function AudienceArt() {
  const rows: { name: string; chain: string; logo: ChainKey }[] = [
    { name: "vitalik.eth", chain: "Ethereum", logo: "ethereum" },
    { name: "punk6529.eth", chain: "Base", logo: "base" },
    { name: "cobie.eth", chain: "Arbitrum", logo: "arbitrum" },
  ];
  return (
    <Frame title="Audience · Onchain">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-foreground">
          Matched wallets
        </span>
        <span className="text-lg font-extrabold text-primary">1,842</span>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.name}
            className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-white">
              <ChainLogo chain={r.logo} size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">
                {r.name}
              </div>
            </div>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {r.chain}
            </span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/** Onchain event → automation. */
function AutomationArt() {
  const steps = [
    { icon: BoltIcon, label: "Wallet mints your NFT", tone: "text-sky-500" },
    { icon: ClockIcon, label: "Wait 1 day", tone: "text-violet-500" },
    { icon: EnvelopeIcon, label: "Send welcome email", tone: "text-primary" },
  ];
  return (
    <Frame title="Automation · Flow">
      <div className="space-y-0">
        {steps.map((s, i) => (
          <div key={s.label}>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <s.icon aria-hidden="true" className={`h-4 w-4 ${s.tone}`} />
              </span>
              <span className="text-sm font-medium text-foreground">
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 ? (
              <div className="ml-[27px] h-5 w-px bg-gradient-to-b from-primary/40 to-primary/10" />
            ) : null}
          </div>
        ))}
      </div>
    </Frame>
  );
}

/** Personalized campaigns that convert. */
function CampaignArt() {
  return (
    <Frame title="Campaign · Email">
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="text-xs text-muted-foreground">Subject</div>
        <div className="mt-0.5 text-sm font-semibold text-foreground">
          Welcome onchain, alex.eth 👋
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="h-2.5 w-full rounded bg-muted" />
          <div className="h-2.5 w-4/5 rounded bg-muted" />
          <div className="h-2.5 w-2/3 rounded bg-muted" />
        </div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          <PaperAirplaneIcon aria-hidden="true" className="h-3.5 w-3.5" />
          Claim reward
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Delivered</span>
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          98.4%
        </span>
      </div>
    </Frame>
  );
}

/** Measure conversions and revenue. */
function AnalyticsArt() {
  const bars = [
    { id: "b1", h: 42 },
    { id: "b2", h: 58 },
    { id: "b3", h: 50 },
    { id: "b4", h: 74 },
    { id: "b5", h: 88 },
    { id: "b6", h: 100 },
  ];
  return (
    <Frame title="Analytics · Performance">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">
            Revenue attributed
          </div>
          <div className="text-lg font-extrabold text-foreground">$48.2k</div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          <ArrowTrendingUpIcon aria-hidden="true" className="h-3.5 w-3.5" />
          +32%
        </span>
      </div>
      <div className="flex h-28 items-end gap-2">
        {bars.map((b) => (
          <div
            key={b.id}
            className="flex-1 rounded-t-md bg-gradient-to-t from-primary/40 to-primary"
            style={{ height: `${b.h}%` }}
          />
        ))}
      </div>
    </Frame>
  );
}

const CAPTIONS = {
  audience: "See every wallet that touches your protocol - and reach them.",
  automation: "Trigger journeys the moment something happens onchain.",
  campaign: "Send personalized, on-brand emails that convert.",
  analytics: "Tie every message back to conversions and revenue.",
};

export function IllustrationSection({ currentStep }: IllustrationSectionProps) {
  let art: React.ReactNode;
  let caption: string;

  switch (currentStep) {
    case 2:
      art = <AnalyticsArt />;
      caption = CAPTIONS.analytics;
      break;
    case 3:
      art = <CampaignArt />;
      caption = CAPTIONS.campaign;
      break;
    case 4:
      art = <AnalyticsArt />;
      caption = CAPTIONS.analytics;
      break;
    case 5:
      art = <AutomationArt />;
      caption = CAPTIONS.automation;
      break;
    default:
      art = <AudienceArt />;
      caption = CAPTIONS.audience;
  }

  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background lg:flex lg:items-center lg:justify-center lg:p-16">
      {/* subtle brand grid + glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.4] [background-image:linear-gradient(rgba(23,39,224,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(23,39,224,0.06)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent_75%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-primary/20 blur-3xl"
      />
      <div className="relative flex flex-col items-center text-center">
        {art}
        <p className="mt-8 max-w-xs text-sm leading-6 text-muted-foreground">
          {caption}
        </p>
      </div>
    </div>
  );
}
