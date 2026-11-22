"use client";

import { useId } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  CONSENT_SOURCE_OPTIONS,
  type ConsentDraft,
  type ConsentSourceChoice,
} from "../../utils/consent";

/**
 * "How did these contacts opt in?" - the declaration every CSV import and
 * list migration now has to carry (backend `modules/consent`). Controlled;
 * the parent validates with `consentDraftError` and sends
 * `toConsentDeclaration(draft)`.
 */
export function ConsentDeclarationFields({
  value,
  onChange,
  error,
  showRowDateNote = true,
}: {
  value: ConsentDraft;
  onChange: (next: ConsentDraft) => void;
  /** Shown under the fields once the importer tries to continue. */
  error?: string | null;
  /** CSV imports read per-row opt-in dates; migrations do not have columns. */
  showRowDateNote?: boolean;
}) {
  const id = useId();
  const set = <K extends keyof ConsentDraft>(key: K, v: ConsentDraft[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div>
        <h3
          id={`${id}-title`}
          className="text-sm font-semibold text-foreground"
        >
          How did these contacts opt in?
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Required. We record this with every contact, so you can answer a
          complaint or a data request later. Bought, rented or scraped lists
          aren&apos;t allowed: the people on them never agreed to hear from you,
          and mailing them gets sending domains blocked.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-source`}>Opt-in source</Label>
        <Select
          value={value.source || undefined}
          onValueChange={(v) => set("source", v as ConsentSourceChoice)}
        >
          <SelectTrigger id={`${id}-source`} className="w-full">
            <SelectValue placeholder="Choose one" />
          </SelectTrigger>
          <SelectContent>
            {CONSENT_SOURCE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {value.source === "other" ? (
          <Input
            aria-label="Describe how they opted in"
            placeholder="e.g. Joined through our Telegram bot"
            maxLength={200}
            value={value.otherSource}
            onChange={(e) => set("otherSource", e.target.value)}
          />
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-date`}>
            Date they opted in{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <Input
            id={`${id}-date`}
            type="date"
            value={value.obtainedAt}
            onChange={(e) => set("obtainedAt", e.target.value)}
          />
          {showRowDateNote ? (
            <p className="text-xs text-muted-foreground">
              A per-row <code>opt_in_date</code>, <code>consent_date</code> or{" "}
              <code>opted_in_at</code> column overrides this date for that row.
            </p>
          ) : null}
        </div>
        <div className="flex items-start gap-2 sm:pt-7">
          <Checkbox
            id={`${id}-doi`}
            checked={value.doubleOptIn}
            onCheckedChange={(v) => set("doubleOptIn", v === true)}
            className="mt-0.5"
          />
          <Label
            htmlFor={`${id}-doi`}
            className="text-sm font-normal leading-snug"
          >
            They confirmed by email (double opt-in)
          </Label>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-proof`}>
          Proof or notes{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id={`${id}-proof`}
          rows={2}
          maxLength={2000}
          placeholder="A link to the signup form, the wording they agreed to, or where the export came from"
          value={value.proof}
          onChange={(e) => set("proof", e.target.value)}
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}
