"use client";

import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
  SignalIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";

import type { AudienceProfile } from "../audience.service";
import {
  deriveDisplayName,
  extractSocialHandles,
  extractWalletFields,
  getChainMeta,
  isAddressLike,
  isSyntheticWalletEmail,
  normalizeTags,
  pseudoEth,
} from "../utils";
import { ApplyTagsPopover } from "./apply-tags-popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

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
}: {
  profile: AudienceProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableTags: string[];
  applyingTags: boolean;
  onApplyTags: (profileId: string, tags: string[]) => Promise<void> | void;
  onCompose: (profile: AudienceProfile) => void;
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
    return {
      title: named ?? (walletFull ? wallet : deriveDisplayName(profile)),
      walletFull,
      walletShort: wallet,
      email,
      verified,
      tags: normalizeTags(profile.tags),
      homeChain: chain?.name ?? primaryWallet?.chain ?? "-",
      hasFarcaster: verified,
      hasPush: Boolean(walletFull),
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
                <SignalIcon
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
                    {derived.walletFull
                      ? `${pseudoEth(derived.walletFull).toFixed(1)} ETH`
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
                    linked={Boolean(derived.email) || derived.verified}
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
                  <Channel
                    icon={<SignalIcon className="size-4" aria-hidden="true" />}
                    label="Farcaster"
                    status={derived.hasFarcaster ? "FID linked" : "not linked"}
                    linked={derived.hasFarcaster}
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
              <Button asChild variant="outline" className="rounded-xl">
                <Link
                  href={`${PRIVATE_ROUTES.AUDIENCE}/${encodeURIComponent(profile.id)}`}
                >
                  <ArrowTopRightOnSquareIcon
                    className="mr-1.5 size-4"
                    aria-hidden="true"
                  />
                  Full profile
                </Link>
              </Button>
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
