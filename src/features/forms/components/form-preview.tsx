"use client";

import {
  EnvelopeIcon,
  LockClosedIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { memo } from "react";

import { cn } from "@/lib/utils";

import type { CaptureFieldSpec } from "../forms.service";

const DEFAULT_FIELDS: CaptureFieldSpec[] = [
  { key: "email", label: "Email address", type: "email", required: true },
];

const placeholderFor = (field: CaptureFieldSpec) => {
  switch (field.type) {
    case "email":
      return "you@example.com";
    case "wallet":
      return "0x… or ENS";
    default:
      return field.label ?? field.key;
  }
};

/**
 * Live rendering of the embeddable capture form, driven by the form's field
 * spec. Purely presentational (inputs disabled) - mirrors what visitors see
 * when the embed snippet is dropped on a site.
 */
export const FormPreview = memo(function FormPreview({
  name,
  fields,
  zkEnabled,
  compact = false,
  className,
}: {
  name: string;
  fields: CaptureFieldSpec[];
  zkEnabled: boolean;
  /** Tighter spacing for card thumbnails. */
  compact?: boolean;
  className?: string;
}) {
  const specs = fields.length > 0 ? fields : DEFAULT_FIELDS;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/40",
        compact ? "p-3" : "p-6",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto w-full rounded-lg border border-border bg-card shadow-sm",
          compact ? "max-w-xs space-y-2 p-3" : "max-w-sm space-y-3 p-5"
        )}
      >
        <p
          className={cn(
            "font-medium text-foreground",
            compact ? "text-xs" : "text-sm"
          )}
        >
          {name || "Untitled form"}
        </p>
        {specs.map((field) => (
          <div key={field.key} className="space-y-1">
            {!compact && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {field.type === "wallet" ? (
                  <WalletIcon className="h-3 w-3" aria-hidden="true" />
                ) : field.type === "email" ? (
                  <EnvelopeIcon className="h-3 w-3" aria-hidden="true" />
                ) : null}
                {field.label ?? field.key}
                {field.required ? (
                  <span className="text-destructive">*</span>
                ) : null}
              </span>
            )}
            <div
              className={cn(
                "flex items-center rounded-md border border-input bg-background px-2 text-muted-foreground/70",
                compact ? "h-6 text-[10px]" : "h-9 text-xs"
              )}
            >
              {placeholderFor(field)}
            </div>
          </div>
        ))}
        <div
          className={cn(
            "flex items-center justify-center rounded-md bg-primary font-medium text-primary-foreground",
            compact ? "h-6 text-[10px]" : "h-9 text-xs"
          )}
        >
          Subscribe
        </div>
        {zkEnabled ? (
          <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <LockClosedIcon className="h-3 w-3" aria-hidden="true" />
            Encrypted end-to-end
          </p>
        ) : null}
      </div>
    </div>
  );
});
