"use client";

import {
  ArrowsRightLeftIcon,
  ArrowUpTrayIcon,
  BoltIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CursorArrowRaysIcon,
  FingerPrintIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { FRESHNESS } from "../../data/sources";
import type {
  DataSource,
  Freshness,
  SourceKindIcon,
} from "../../types/sources";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

/** SourceKindIcon (data-layer key) -> Heroicon, so the data stays React-free. */
export const KIND_ICON: Record<SourceKindIcon, IconType> = {
  fingerprint: FingerPrintIcon,
  network: GlobeAltIcon,
  "clipboard-list": ClipboardDocumentListIcon,
  "square-mouse-pointer": CursorArrowRaysIcon,
  "arrow-left-right": ArrowsRightLeftIcon,
};

const FRESH_ICON: Record<Freshness, IconType> = {
  live: BoltIcon,
  scheduled: ClockIcon,
  "one-off": ArrowUpTrayIcon,
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
  source: DataSource;
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
  const Icon = FRESH_ICON[freshness];
  return (
    <span
      title={FRESHNESS[freshness].can}
      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
    >
      <Icon aria-hidden="true" className="size-3" />
      {FRESHNESS[freshness].label}
    </span>
  );
}
