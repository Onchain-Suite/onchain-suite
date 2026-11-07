"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

import type {
  SmsA2pStatus,
  SmsA2pSubmission,
} from "@/features/integrations/connections.service";
import { connectionsService } from "@/features/integrations/connections.service";
import { CONNECTIONS_PREFIX } from "@/features/integrations/hooks/use-connections";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";

const BUSINESS_TYPES = [
  "Corporation",
  "Limited Liability Corporation",
  "Partnership",
  "Non-profit Corporation",
  "Co-operative",
  "Sole Proprietorship",
];
const INDUSTRIES = [
  ["FINTECH", "Fintech"],
  ["TECHNOLOGY", "Technology"],
  ["FINANCIAL", "Financial services"],
  ["ONLINE", "Online"],
  ["MEDIA", "Media"],
  ["PROFESSIONAL_SERVICES", "Professional services"],
  ["RETAIL", "Retail"],
] as const;
const ID_TYPES = ["EIN", "DUNS", "VAT", "CN", "RN", "Other"];
const COMPANY_TYPES = [
  ["private", "Private"],
  ["public", "Public (listed)"],
  ["non-profit", "Non-profit"],
  ["government", "Government"],
] as const;
const JOB_POSITIONS = [
  "CEO",
  "CFO",
  "Director",
  "GM",
  "VP",
  "General Counsel",
  "Other",
];
const REGIONS = [
  ["USA_AND_CANADA", "USA & Canada"],
  ["EUROPE", "Europe"],
  ["AFRICA", "Africa"],
  ["ASIA", "Asia"],
  ["LATIN_AMERICA", "Latin America"],
] as const;

/** Stages where submitting again replaces the attempt. */
const RESTARTABLE = new Set([
  "START_FAILED",
  "PROFILES_REJECTED",
  "BRAND_FAILED",
  "CAMPAIGN_FAILED",
]);

export const smsA2pKey = (orgId: string | null) =>
  [...CONNECTIONS_PREFIX, "sms", "a2p", orgId] as const;

const EMPTY: SmsA2pSubmission = {
  email: "",
  brandType: "LOW_VOLUME_STANDARD",
  business: {
    name: "",
    type: "Corporation",
    industry: "FINTECH",
    idType: "EIN",
    idNumber: "",
    regions: ["USA_AND_CANADA"],
    websiteUrl: "",
    companyType: "private",
  },
  representative: {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    title: "",
    jobPosition: "CEO",
  },
  address: { street: "", city: "", region: "", postalCode: "", country: "US" },
  campaign: {
    description: "",
    messageFlow: "",
    samples: ["", ""],
    hasEmbeddedLinks: false,
    hasEmbeddedPhone: false,
  },
};

/** The checks carriers reject on, run before anything is sent. Pure. */
export function problems(f: SmsA2pSubmission): string[] {
  const out: string[] = [];
  const need = (v: string, label: string) => {
    if (!v.trim()) out.push(`${label} is required.`);
  };
  need(f.email, "Contact email");
  need(f.business.name, "Legal business name");
  need(f.business.idNumber, "Tax ID");
  if (!/^https?:\/\/\S+\.\S+$/i.test(f.business.websiteUrl.trim())) {
    out.push("Website must be a full URL, like https://acme.xyz.");
  }
  if (f.business.regions.length === 0) out.push("Pick at least one region.");
  if (
    f.business.companyType === "public" &&
    (!f.business.stockExchange?.trim() || !f.business.stockTicker?.trim())
  ) {
    out.push("A public company needs its stock exchange and ticker.");
  }
  need(f.representative.firstName, "Representative first name");
  need(f.representative.lastName, "Representative last name");
  need(f.representative.email, "Representative email");
  need(f.representative.phone, "Representative phone");
  need(f.representative.title, "Representative title");
  need(f.address.street, "Street");
  need(f.address.city, "City");
  need(f.address.region, "State or region");
  need(f.address.postalCode, "Postal code");
  if (!/^[A-Za-z]{2}$/.test(f.address.country))
    out.push("Country is a 2-letter code.");
  if (f.campaign.description.trim().length < 40) {
    out.push("Describe the campaign in at least 40 characters.");
  }
  if (f.campaign.messageFlow.trim().length < 40) {
    out.push("Explain how people opt in, in at least 40 characters.");
  }
  const samples = f.campaign.samples.map((s) => s.trim()).filter(Boolean);
  if (samples.length < 2) out.push("Add at least two sample messages.");
  if (samples.some((s) => s.length < 20)) {
    out.push("Each sample message needs at least 20 characters.");
  }
  if (samples.length > 0 && !samples.some((s) => /\bSTOP\b/i.test(s))) {
    out.push(
      'At least one sample must say how to opt out, e.g. "Reply STOP to opt out."'
    );
  }
  return out;
}

/**
 * US texting registration (A2P 10DLC) for a number OnChain Suite set up. US
 * carriers block marketing texts from unregistered numbers; registering takes
 * a few days to a few weeks of review and runs on its own once submitted.
 */
export function SmsUsRegistration() {
  const { organizationId } = useAccountOrg();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const status = useQuery({
    queryKey: smsA2pKey(organizationId),
    enabled: Boolean(organizationId),
    retry: false,
    staleTime: 60_000,
    queryFn: () => connectionsService.smsA2pStatus(organizationId ?? undefined),
  });

  const refresh = useMutation({
    mutationFn: () =>
      connectionsService.smsA2pRefresh(organizationId ?? undefined),
    onSuccess: (s) => qc.setQueryData(smsA2pKey(organizationId), s),
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't check now."),
  });

  const s = status.data;
  if (!s?.available) return null;
  const canSubmit = !s.stage || RESTARTABLE.has(s.stage);
  const done = s.stage === "COMPLETE";

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">
          US texting registration
        </h3>
        <p className="text-xs text-muted-foreground">
          {s.stage
            ? s.hint
            : "US carriers block marketing texts from unregistered numbers. Register your business once to text US phones."}
        </p>
      </div>

      {s.lastError && !done ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {s.lastError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canSubmit ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            {s.stage ? "Fix and resubmit" : "Register"}
          </Button>
        ) : null}
        {s.stage && !canSubmit && !done ? (
          <Button
            size="sm"
            variant="outline"
            disabled={refresh.isPending}
            onClick={() => refresh.mutate()}
          >
            {refresh.isPending ? "Checking..." : "Check now"}
          </Button>
        ) : null}
      </div>

      <RegistrationDialog
        open={open}
        onOpenChange={setOpen}
        organizationId={organizationId}
        onSubmitted={(next: SmsA2pStatus) =>
          qc.setQueryData(smsA2pKey(organizationId), next)
        }
      />
    </div>
  );
}

function RegistrationDialog({
  open,
  onOpenChange,
  organizationId,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | null;
  onSubmitted: (s: SmsA2pStatus) => void;
}) {
  const [form, setForm] = useState<SmsA2pSubmission>(EMPTY);
  const [shown, setShown] = useState<string[]>([]);

  const set = <K extends keyof SmsA2pSubmission>(
    key: K,
    patch: Partial<SmsA2pSubmission[K]> | SmsA2pSubmission[K]
  ) =>
    setForm((f) => ({
      ...f,
      [key]:
        typeof f[key] === "object"
          ? { ...(f[key] as object), ...(patch as object) }
          : patch,
    }));

  const submit = useMutation({
    mutationFn: () =>
      connectionsService.smsA2pSubmit(
        {
          ...form,
          address: {
            ...form.address,
            country: form.address.country.toUpperCase(),
          },
          campaign: {
            ...form.campaign,
            samples: form.campaign.samples.map((x) => x.trim()).filter(Boolean),
          },
        },
        organizationId ?? undefined
      ),
    onSuccess: (s) => {
      onSubmitted(s);
      toast.success("Submitted for review");
      onOpenChange(false);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't submit."),
  });

  const onSubmit = () => {
    const p = problems(form);
    setShown(p);
    if (p.length === 0) submit.mutate();
  };

  const busy = submit.isPending;

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Register for US texting</DialogTitle>
          <DialogDescription>
            Use your legal business details exactly as they appear on your tax
            records. Mismatches are the most common reason for rejection.
          </DialogDescription>
        </DialogHeader>

        <Section title="Business">
          <Field label="Legal business name" id="a2p-name">
            <Input
              id="a2p-name"
              value={form.business.name}
              onChange={(e) => set("business", { name: e.target.value })}
            />
          </Field>
          <Field label="Website" id="a2p-web">
            <Input
              id="a2p-web"
              placeholder="https://acme.xyz"
              value={form.business.websiteUrl}
              onChange={(e) => set("business", { websiteUrl: e.target.value })}
            />
          </Field>
          <Field label="Business type" id="a2p-type">
            <Pick
              id="a2p-type"
              value={form.business.type}
              onChange={(v) => set("business", { type: v })}
              options={BUSINESS_TYPES.map((t) => [t, t])}
            />
          </Field>
          <Field label="Industry" id="a2p-industry">
            <Pick
              id="a2p-industry"
              value={form.business.industry}
              onChange={(v) => set("business", { industry: v })}
              options={INDUSTRIES}
            />
          </Field>
          <Field label="Tax ID type" id="a2p-idtype">
            <Pick
              id="a2p-idtype"
              value={form.business.idType}
              onChange={(v) => set("business", { idType: v })}
              options={ID_TYPES.map((t) => [t, t])}
            />
          </Field>
          <Field label="Tax ID" id="a2p-id">
            <Input
              id="a2p-id"
              placeholder="12-3456789"
              value={form.business.idNumber}
              onChange={(e) => set("business", { idNumber: e.target.value })}
            />
          </Field>
          <Field label="Company type" id="a2p-company">
            <Pick
              id="a2p-company"
              value={form.business.companyType}
              onChange={(v) => set("business", { companyType: v })}
              options={COMPANY_TYPES}
            />
          </Field>
          {form.business.companyType === "public" ? (
            <>
              <Field label="Stock exchange" id="a2p-exchange">
                <Input
                  id="a2p-exchange"
                  placeholder="NASDAQ"
                  value={form.business.stockExchange ?? ""}
                  onChange={(e) =>
                    set("business", { stockExchange: e.target.value })
                  }
                />
              </Field>
              <Field label="Ticker" id="a2p-ticker">
                <Input
                  id="a2p-ticker"
                  value={form.business.stockTicker ?? ""}
                  onChange={(e) =>
                    set("business", { stockTicker: e.target.value })
                  }
                />
              </Field>
            </>
          ) : null}
          <fieldset className="space-y-1.5 sm:col-span-2">
            <legend className="text-sm font-medium">Where you operate</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {REGIONS.map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.business.regions.includes(value)}
                    onCheckedChange={(on) =>
                      set("business", {
                        regions: on
                          ? [...form.business.regions, value]
                          : form.business.regions.filter((r) => r !== value),
                      })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Contact email for the review" id="a2p-email">
            <Input
              id="a2p-email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
        </Section>

        <Section title="Authorized representative">
          <Field label="First name" id="a2p-first">
            <Input
              id="a2p-first"
              value={form.representative.firstName}
              onChange={(e) =>
                set("representative", { firstName: e.target.value })
              }
            />
          </Field>
          <Field label="Last name" id="a2p-last">
            <Input
              id="a2p-last"
              value={form.representative.lastName}
              onChange={(e) =>
                set("representative", { lastName: e.target.value })
              }
            />
          </Field>
          <Field label="Email" id="a2p-rep-email">
            <Input
              id="a2p-rep-email"
              type="email"
              value={form.representative.email}
              onChange={(e) => set("representative", { email: e.target.value })}
            />
          </Field>
          <Field label="Phone (with country code)" id="a2p-rep-phone">
            <Input
              id="a2p-rep-phone"
              placeholder="+1 415 555 2671"
              value={form.representative.phone}
              onChange={(e) => set("representative", { phone: e.target.value })}
            />
          </Field>
          <Field label="Title" id="a2p-title">
            <Input
              id="a2p-title"
              placeholder="Head of Growth"
              value={form.representative.title}
              onChange={(e) => set("representative", { title: e.target.value })}
            />
          </Field>
          <Field label="Position" id="a2p-position">
            <Pick
              id="a2p-position"
              value={form.representative.jobPosition}
              onChange={(v) => set("representative", { jobPosition: v })}
              options={JOB_POSITIONS.map((t) => [t, t])}
            />
          </Field>
        </Section>

        <Section title="Business address">
          <Field label="Street" id="a2p-street" wide>
            <Input
              id="a2p-street"
              value={form.address.street}
              onChange={(e) => set("address", { street: e.target.value })}
            />
          </Field>
          <Field label="City" id="a2p-city">
            <Input
              id="a2p-city"
              value={form.address.city}
              onChange={(e) => set("address", { city: e.target.value })}
            />
          </Field>
          <Field label="State or region" id="a2p-region">
            <Input
              id="a2p-region"
              value={form.address.region}
              onChange={(e) => set("address", { region: e.target.value })}
            />
          </Field>
          <Field label="Postal code" id="a2p-postal">
            <Input
              id="a2p-postal"
              value={form.address.postalCode}
              onChange={(e) => set("address", { postalCode: e.target.value })}
            />
          </Field>
          <Field label="Country" id="a2p-country">
            <Input
              id="a2p-country"
              maxLength={2}
              value={form.address.country}
              onChange={(e) =>
                set("address", { country: e.target.value.toUpperCase() })
              }
            />
          </Field>
        </Section>

        <Section title="Campaign">
          <Field label="What you'll send" id="a2p-desc" wide>
            <Textarea
              id="a2p-desc"
              rows={2}
              placeholder="Product updates, reward and governance alerts for Acme users who opted in."
              value={form.campaign.description}
              onChange={(e) => set("campaign", { description: e.target.value })}
            />
          </Field>
          <Field label="How people opt in" id="a2p-flow" wide>
            <Textarea
              id="a2p-flow"
              rows={2}
              placeholder="Users enter their number in Acme app settings, tick an unchecked consent box, then reply YES to our confirmation text."
              value={form.campaign.messageFlow}
              onChange={(e) => set("campaign", { messageFlow: e.target.value })}
            />
          </Field>
          {form.campaign.samples.map((sample, i) => (
            <Field
              key={i}
              label={`Sample message ${i + 1}`}
              id={`a2p-sample-${i}`}
              wide
            >
              <Textarea
                id={`a2p-sample-${i}`}
                rows={2}
                placeholder="Acme: your weekly rewards are ready at acme.xyz/rewards. Reply STOP to opt out."
                value={sample}
                onChange={(e) =>
                  set("campaign", {
                    samples: form.campaign.samples.map((x, j) =>
                      j === i ? e.target.value : x
                    ),
                  })
                }
              />
            </Field>
          ))}
          {form.campaign.samples.length < 5 ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="w-fit"
              onClick={() =>
                set("campaign", { samples: [...form.campaign.samples, ""] })
              }
            >
              Add a sample
            </Button>
          ) : null}
          <div className="flex flex-wrap gap-x-4 gap-y-2 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.campaign.hasEmbeddedLinks}
                onCheckedChange={(on) =>
                  set("campaign", { hasEmbeddedLinks: on === true })
                }
              />
              Messages include links
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.campaign.hasEmbeddedPhone}
                onCheckedChange={(on) =>
                  set("campaign", { hasEmbeddedPhone: on === true })
                }
              />
              Messages include phone numbers
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.brandType === "STANDARD"}
                onCheckedChange={(on) =>
                  set("brandType", on ? "STANDARD" : "LOW_VOLUME_STANDARD")
                }
              />
              Over 6,000 messages a day (standard brand, vetted)
            </label>
          </div>
        </Section>

        {shown.length > 0 ? (
          <ul
            role="alert"
            className="space-y-0.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
          >
            {shown.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        ) : null}

        <DialogFooter>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button disabled={busy} onClick={onSubmit}>
            {busy ? "Submitting..." : "Submit for review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  id,
  wide,
  children,
}: {
  label: string;
  id: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Pick({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, label]) => (
          <SelectItem key={v} value={v}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
