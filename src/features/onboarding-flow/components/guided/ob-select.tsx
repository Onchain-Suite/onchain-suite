"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";

import type { ChainKey } from "@/onchain-suite-website/components/landing/v2/chain-logos";
import { ChainLogo } from "@/onchain-suite-website/components/landing/v2/chain-logos";

export interface ObSelectOption {
  value: string;
  label: string;
  /** Chain mark shown before the label (chain pickers only). */
  logo?: ChainKey;
}

/**
 * The onboarding select, styled like the flow's inputs (reference
 * `.ob__input--select`): same border and fill, primary border on focus, its
 * own chevron. It is only as wide as its longest option, and the menu opens
 * aligned to its left edge at that same width, so a short list never stretches
 * across the form.
 */
export function ObSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: ObSelectOption[];
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const withLogos = options.some((o) => o.logo);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          "border-input dark:bg-input/30 h-9 w-auto min-w-[8.5rem] shrink-0 bg-transparent shadow-xs",
          "focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-[3px]",
          "data-[state=open]:border-primary",
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        position="popper"
        align="start"
        sideOffset={4}
        className="min-w-(--radix-select-trigger-width) w-auto"
      >
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="pr-8">
            <span className="flex items-center gap-2">
              {o.logo ? (
                <ChainLogo chain={o.logo} size={15} />
              ) : withLogos ? (
                <span
                  aria-hidden="true"
                  className="bg-muted-foreground/30 h-3.5 w-3.5 rounded-full"
                />
              ) : null}
              {o.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
