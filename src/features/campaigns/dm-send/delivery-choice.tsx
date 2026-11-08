"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export interface DeliveryOption<T extends string> {
  value: T;
  label: string;
  hint: string;
}

/**
 * How a social campaign goes out: one public post, or a message to each
 * person (a DM, a Mini App notification). Each option's hint says up front who
 * it can reach, which the send step will hold the client to.
 */
export function DeliveryChoice<T extends string>({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly DeliveryOption<T>[];
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => {
        const picked = options.find((o) => o.value === v);
        if (picked) onChange(picked.value);
      }}
      className="grid gap-2 sm:grid-cols-2"
      aria-label="How to send"
    >
      {options.map((o) => (
        <Label
          key={o.value}
          htmlFor={`${id}-${o.value}`}
          className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-3 font-normal has-[[data-state=checked]]:border-primary"
        >
          <RadioGroupItem
            id={`${id}-${o.value}`}
            value={o.value}
            className="mt-0.5"
          />
          <span className="min-w-0 space-y-0.5">
            <span className="block text-sm font-medium text-foreground">
              {o.label}
            </span>
            <span className="block text-xs text-muted-foreground">
              {o.hint}
            </span>
          </span>
        </Label>
      ))}
    </RadioGroup>
  );
}
