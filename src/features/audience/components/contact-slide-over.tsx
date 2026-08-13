"use client";

import {
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  FingerPrintIcon,
  PaperAirplaneIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import type { AudienceProfile, AudienceSegment } from "../audience.service";
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
import { ApplyTagsPopover } from "./apply-tags-popover";
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
      <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
      </div>
      <span className="text-xs text-muted-foreground">{status}</span>
      {linked ? (
        <CheckCircleIcon
          className="size-5 shrink-0 text-emerald-500"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

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
    return {
      title: named ?? (walletFull ? wallet : deriveDisplayName(profile)),
      walletFull,
      walletShort: wallet,
      email,
      verified,
      tags: normalizeTags(profile.tags),
      homeChain: chain?.name ?? primaryWallet?.chain ?? "-",
      lifetimeUsd: lifetimeUsd(profile),
      emailLinked: channels
        ? Boolean(channels.email)
        : Boolean(email) || verified,
      hasPush: channels ? Boolean(channels.inapp) : Boolean(walletFull),
    };
  }, [profile]);

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
            </SheetHeader>

            <div className="space-y-6 p-6">
              <div className="grid grid-cols-2 gap-3">
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
                </div>
              </div>

              {derived.walletFull ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  Identity source: ZK-verified link. The wallet is the record;
                  channels attach to it and resolve lazily.
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
                disabled={!derived.email}
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
