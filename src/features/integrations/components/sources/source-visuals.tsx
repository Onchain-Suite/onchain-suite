"use client";

import {
  ArrowDataTransferHorizontalIcon,
  Clock01Icon,
  CursorPointer01Icon,
  File01Icon,
  FingerPrintIcon,
  FlashIcon,
  Globe02Icon,
  Upload04Icon,
} from "@hugeicons/core-free-icons";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { FRESHNESS } from "../../data/sources";
import type { Freshness, SourceKindIcon } from "../../types/sources";
import { Icon, type IconSvgElement } from "@/shared/components/common/hugeicon";

/** SourceKindIcon (data-layer key) -> icon, so the data stays React-free. */
export const KIND_ICON: Record<SourceKindIcon, IconSvgElement> = {
  fingerprint: FingerPrintIcon,
  network: Globe02Icon,
  "clipboard-list": File01Icon,
  "square-mouse-pointer": CursorPointer01Icon,
  "arrow-left-right": ArrowDataTransferHorizontalIcon,
};

const FRESH_ICON: Record<Freshness, IconSvgElement> = {
  live: FlashIcon,
  scheduled: Clock01Icon,
  "one-off": Upload04Icon,
};

/**
 * The vendor's own icon over a monogram fallback. Fetched from the vendor's
 * domain rather than drawn by us (a hand-made approximation of someone's logo is
 * their trademark rendered wrong). The monogram shows through whenever the
 * request fails - some block hotlinking, some have no icon at that size - so the
 * card looks finished either way. Anything we build ourselves has no domain and
 * makes no request.
 */
export function SourceMark({
  source,
  className,
}: {
  /** Anything with a name and, when it is a vendor's, their domain. */
  source: { name: string; domain?: string };
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const show = Boolean(source.domain) && !failed;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted text-sm font-semibold text-muted-foreground",
        className
      )}
    >
      {show ? (
        // Vendor favicon by domain, painted over the monogram; falls back on error.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://icons.duckduckgo.com/ip3/${source.domain}.ico`}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-5 object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        source.name[0]?.toUpperCase()
      )}
    </span>
  );
}

/** A freshness chip (Live / Scheduled / One-off) with its latency note on hover. */
export function FreshChip({ freshness }: { freshness: Freshness }) {
  return (
    <span
      title={FRESHNESS[freshness].can}
      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
    >
      <Icon icon={FRESH_ICON[freshness]} className="size-3" />
      {FRESHNESS[freshness].label}
    </span>
  );
}
