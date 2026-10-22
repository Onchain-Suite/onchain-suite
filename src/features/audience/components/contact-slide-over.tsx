"use client";

import {
  AtSymbolIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  FingerPrintIcon,
  HashtagIcon,
  PaperAirplaneIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  type AudienceProfile,
  type AudienceSegment,
  audienceService,
} from "../audience.service";
import {
  deriveDisplayName,
  extractSocialHandles,
  extractWalletFields,
  formatUsd,
  getChainMeta,
  isAddressLike,
  isSyntheticWalletEmail,
  lifetimeUsd,
  normalizeTags,
  readChannels,
} from "../utils";
import { stageForProfile } from "../utils/lifecycle";
import { ApplyTagsPopover } from "./apply-tags-popover";
import {
  AppIconCluster,
  ChainIconCluster,
  TokenIconCluster,
} from "./icon-cluster";
import { StageBadge } from "./stage-badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";

function Channel({
  icon,
  label,
  status,
  linked,
}: {
  icon: React.ReactNode;
  label: string;
  status: string;
  linked: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </span>
      <p className="shrink-0 text-sm font-medium text-foreground">{label}</p>
      <span
        className="min-w-0 flex-1 truncate text-right text-xs text-muted-foreground"
        title={status}
      >
        {status}
      </span>
      {linked ? (
        <CheckCircleIcon
          className="size-5 shrink-0 text-emerald-500"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

/**
 * Social channels shown as sibling rows under Email + In-app push (CLAUDE.md
 * 0.5.4). `channelKey` is the reachability flag on `AudienceChannels`;
 * `handleKey` is where the visible handle lives in `extractSocialHandles` (X's
 * handle is `twitter`), if any. A row renders only when the channel is actually
 * reachable, so an empty contact shows just the channels it has.
 */
const SOCIAL_CHANNELS: Array<{
  channelKey: "x" | "telegram" | "discord" | "farcaster";
  label: string;
  icon: React.ReactNode;
  handleKey?: "twitter" | "telegram" | "discord";
}> = [
  {
    channelKey: "x",
    label: "X",
    icon: <AtSymbolIcon className="size-4" aria-hidden="true" />,
    handleKey: "twitter",
  },
  {
    channelKey: "telegram",
    label: "Telegram",
    icon: <PaperAirplaneIcon className="size-4" aria-hidden="true" />,
    handleKey: "telegram",
  },
  {
    channelKey: "discord",
    label: "Discord",
    icon: <ChatBubbleLeftRightIcon className="size-4" aria-hidden="true" />,
    handleKey: "discord",
  },
  {
    channelKey: "farcaster",
    label: "Farcaster",
    icon: <HashtagIcon className="size-4" aria-hidden="true" />,
  },
];

export function ContactSlideOver({
  profile,
  open,
  onOpenChange,
  availableTags,
  applyingTags,
  onApplyTags,
  onCompose,
  segments,
  addingToSegment,
  onAddToSegment,
}: {
  profile: AudienceProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableTags: string[];
  applyingTags: boolean;
  onApplyTags: (profileId: string, tags: string[]) => Promise<void> | void;
  onCompose: (profile: AudienceProfile) => void;
  segments: AudienceSegment[];
  addingToSegment: boolean;
  onAddToSegment: (
    segmentId: string,
    profileId: string
  ) => Promise<void> | void;
}) {
  const derived = useMemo(() => {
    if (!profile) return null;
    const { walletFull, wallet } = extractWalletFields(profile);
    const socials = extractSocialHandles(profile.attributes ?? profile);
    const rawEmail =
      typeof profile.email === "string" ? profile.email : undefined;
    const email =
      rawEmail && !isSyntheticWalletEmail(rawEmail) ? rawEmail : undefined;
    const nameField =
      typeof profile.name === "string" ? profile.name.trim() : "";
    const named =
      nameField && !isAddressLike(nameField)
        ? nameField
        : (socials.ens ?? undefined);
    const verified = profile.status === "verified";
    const primaryWallet = Array.isArray(profile.wallets)
      ? (profile.wallets.find((w) => w?.isPrimary) ?? profile.wallets[0])
      : undefined;
    const chain = getChainMeta(primaryWallet?.chain);
    // Prefer the server's real per-channel reachability; fall back to a
    // heuristic only when the API didn't return a `channels` object.
    const channels = readChannels(profile);
    // Identity source from data, not a hardcoded literal. Fall back to an
    // honest inference from what we do know rather than claiming "ZK-verified".
    const rawSource =
      typeof profile.identitySource === "string"
        ? profile.identitySource.trim()
        : "";
    const identitySource =
      rawSource ||
      (verified
        ? "ZK-verified link"
        : walletFull
          ? "Wallet sign-in"
          : "Imported or form signup");
    return {
      title: named ?? (walletFull ? wallet : deriveDisplayName(profile)),
      walletFull,
      walletShort: wallet,
      email,
      verified,
      stage: stageForProfile(profile),
      tags: normalizeTags(profile.tags),
      homeChain: chain?.name ?? primaryWallet?.chain ?? "-",
      lifetimeUsd: lifetimeUsd(profile),
      channels,
      socials,
      identitySource,
      emailLinked: channels
        ? Boolean(channels.email)
        : Boolean(email) || verified,
      hasPush: channels ? Boolean(channels.inapp) : Boolean(walletFull),
    };
  }, [profile]);

  // Holdings for the one wallet. Keyed per wallet so it is cached independently;
  // only fetched while the sheet is open and the contact has a wallet. The entry
  // is keyed by the lowercased address (wallets with no activity are absent).
  const walletFull = derived?.walletFull ?? "";
  const walletKey = walletFull.toLowerCase();
  const holdingsQuery = useQuery({
    queryKey: ["audience", "wallet-onchain-summary", "one", walletKey],
    queryFn: () => audienceService.getWalletOnchainSummary([walletFull]),
    enabled: open && walletKey.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
  });
  const holdings = walletKey ? holdingsQuery.data?.[walletKey] : undefined;
  const hasHoldings = Boolean(
    holdings &&
    (holdings.chains.length > 0 ||
      holdings.protocols.length > 0 ||
      holdings.tokens.length > 0)
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md"
      >
        {profile && derived ? (
          <>
            <SheetHeader className="border-b border-border p-6">
              <SheetTitle className="flex items-center gap-2 text-lg">
                <FingerPrintIcon
                  className="size-5 text-primary"
                  aria-hidden="true"
                />
                {derived.title}
              </SheetTitle>
              {derived.walletFull ? (
                <p className="font-mono text-sm text-muted-foreground">
                  {derived.walletShort}
                </p>
              ) : null}
              <div className="pt-1">
                <StageBadge stage={derived.stage} />
              </div>
            </SheetHeader>

            <div className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">
                    Lifetime value
                  </p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {typeof derived.lifetimeUsd === "number"
                      ? formatUsd(derived.lifetimeUsd)
                      : "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Home chain</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {derived.homeChain}
                  </p>
                </div>
              </div>

              {derived.walletFull ? (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Holdings
                  </p>
                  {holdingsQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">
                      Loading holdings…
                    </p>
                  ) : hasHoldings && holdings ? (
                    <div className="space-y-2.5">
                      {holdings.chains.length > 0 ? (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-muted-foreground">
                            Chains
                          </span>
                          <ChainIconCluster chains={holdings.chains} max={6} />
                        </div>
                      ) : null}
                      {holdings.protocols.length > 0 ? (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-muted-foreground">
                            Apps
                          </span>
                          <AppIconCluster
                            protocols={holdings.protocols}
                            chips={holdings.protocolChips}
                            max={6}
                          />
                        </div>
                      ) : null}
                      {holdings.tokens.length > 0 ? (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-muted-foreground">
                            Tokens
                          </span>
                          <TokenIconCluster tokens={holdings.tokens} max={6} />
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No on-chain activity synced yet.
                    </p>
                  )}
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Linked channels
                </p>
                <div className="space-y-2">
                  <Channel
                    icon={
                      <EnvelopeIcon className="size-4" aria-hidden="true" />
                    }
                    label="Email"
                    status={derived.email ?? "ZK-protected · identity hidden"}
                    linked={derived.emailLinked}
                  />
                  <Channel
                    icon={
                      <DevicePhoneMobileIcon
                        className="size-4"
                        aria-hidden="true"
                      />
                    }
                    label="In-app push"
                    status={derived.hasPush ? "device signed in" : "no device"}
                    linked={derived.hasPush}
                  />
                  {SOCIAL_CHANNELS.map((c) => {
                    const linked = Boolean(derived.channels?.[c.channelKey]);
                    if (!linked) return null;
                    const handle = c.handleKey
                      ? derived.socials[c.handleKey]
                      : undefined;
                    return (
                      <Channel
                        key={c.channelKey}
                        icon={c.icon}
                        label={c.label}
                        status={handle ?? "connected"}
                        linked
                      />
                    );
                  })}
                </div>
              </div>

              {derived.walletFull ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  Identity source: {derived.identitySource}. The wallet is the
                  record; channels attach to it and resolve lazily.
                </p>
              ) : null}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Tags
                  </p>
                  <ApplyTagsPopover
                    availableTags={availableTags}
                    isApplying={applyingTags}
                    onApply={(tags) => onApplyTags(profile.id, tags)}
                    trigger={
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Add tag
                      </button>
                    }
                  />
                </div>
                {derived.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {derived.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-lg border border-border bg-card px-2.5 py-1 text-sm text-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tags yet.</p>
                )}
              </div>
            </div>

            <div className="mt-auto flex items-center justify-end gap-2 border-t border-border p-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    disabled={segments.length === 0 || addingToSegment}
                  >
                    <PlusIcon className="mr-1.5 size-4" aria-hidden="true" />
                    Add to segment
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="max-h-64 w-56 overflow-y-auto p-1"
                >
                  {segments.length === 0 ? (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">
                      No lists yet.
                    </p>
                  ) : (
                    segments.map((seg) => (
                      <button
                        key={seg.id}
                        type="button"
                        disabled={addingToSegment}
                        onClick={() => onAddToSegment(seg.id, profile.id)}
                        className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                      >
                        {seg.name}
                      </button>
                    ))
                  )}
                </PopoverContent>
              </Popover>
              <Button
                className="rounded-xl"
                // Gate on reachability, not a plaintext address: a ZK-protected
                // contact is email-reachable with the address hidden, and a
                // push-reachable contact has no email at all. Both were wrongly
                // blocked by `!derived.email`.
                disabled={!derived.emailLinked && !derived.hasPush}
                onClick={() => onCompose(profile)}
              >
                <PaperAirplaneIcon
                  className="mr-1.5 size-4"
                  aria-hidden="true"
                />
                Send a test
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
