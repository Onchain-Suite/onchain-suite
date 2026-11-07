"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

/**
 * Post once publicly, or DM each person. The DM option says up front what the
 * consent dialog will ask again at send time: only people who messaged you.
 */
export function DeliveryChoice({
  id,
  value,
  onChange,
  post,
  dm,
}: {
  id: string;
  value: "post" | "dm";
  onChange: (value: "post" | "dm") => void;
  post: { label: string; hint: string };
  dm: { label: string; hint: string };
}) {
  const options = [
    { value: "post" as const, ...post },
    { value: "dm" as const, ...dm },
  ];
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v === "dm" ? "dm" : "post")}
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
