"use client";

import Image from "next/image";

import { COMPARE_LOGOS } from "./compare-data";

/**
 * A competitor's logo, contained (never distorted) in a fixed box and
 * left-aligned. Falls back to a monogram tile when no logo is on file.
 */
export function BrandLogo({
  slug,
  name,
  height = 26,
  maxW = 132,
  className,
}: {
  slug: string;
  name: string;
  /** Rendered box height in px. */
  height?: number;
  /** Max box width in px (the logo is contained within it). */
  maxW?: number;
  className?: string;
}) {
  const src = COMPARE_LOGOS[slug];
  if (!src) {
    const mono = name
      .replace(/[^a-zA-Z]/g, "")
      .slice(0, 2)
      .toUpperCase();
    return (
      <span
        className={`inline-flex items-center justify-center rounded-lg text-[13px] font-semibold ${className ?? ""}`}
        style={{
          height,
          width: height,
          background: "var(--acc-soft)",
          color: "var(--acc)",
        }}
        aria-hidden="true"
      >
        {mono}
      </span>
    );
  }
  return (
    <span
      className={`relative block ${className ?? ""}`}
      style={{ height, width: maxW }}
    >
      <Image
        src={src}
        alt={`${name} logo`}
        fill
        sizes={`${maxW}px`}
        className="object-contain object-left"
      />
    </span>
  );
}
