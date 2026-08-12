"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import type { UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { Switch } from "@/ui/switch";

import { cn } from "@/lib/utils";

import type { CampaignFormData } from "../../validations";

export type PushPlacement =
  "modal" | "banner" | "slide-in" | "inline" | "mobile-push";

const PLACEMENTS: {
  key: PushPlacement;
  label: string;
  desc: string;
}[] = [
  { key: "modal", label: "Modal", desc: "Centred, blocks the page" },
  { key: "banner", label: "Banner", desc: "Sticky bar at the top" },
  { key: "slide-in", label: "Slide-in", desc: "Corner card, non-blocking" },
  { key: "inline", label: "Inline", desc: "Embedded in the page" },
  { key: "mobile-push", label: "Mobile push", desc: "OS notification" },
];

const PLACEMENT_LABEL: Record<PushPlacement, string> = {
  modal: "Modal",
  banner: "Banner",
  "slide-in": "Slide-in",
  inline: "Inline",
  "mobile-push": "Mobile push",
};

const PLACEMENT_BLURB: Record<PushPlacement, string> = {
  modal:
    "Rendered by the SDK inside your dApp - no OS permission needed, so it reaches every connected wallet.",
  banner:
    "A sticky bar pinned to the top of your dApp - always visible, never blocks the page.",
  "slide-in":
    "A dismissible card in the corner of your dApp - noticed without blocking the page.",
  inline:
    "Rendered by the SDK inside your dApp - no OS permission needed, so it reaches every connected wallet.",
  "mobile-push":
    "Delivered as an OS notification. Requires the mobile SDK and notification permission.",
};

type PushFrequency =
  "once-per-wallet" | "once-per-session" | "every-time" | "until-dismissed";

const FREQUENCY_PHRASE: Record<PushFrequency, string> = {
  "once-per-wallet": "once per wallet",
  "once-per-session": "once per session",
  "every-time": "every visit",
  "until-dismissed": "until dismissed",
};

/** Preview caption - reflects the live "Show" setting for web placements. */
function previewBlurb(placement: PushPlacement, frequency: PushFrequency) {
  if (placement === "mobile-push") {
    return "Needs the mobile SDK and notification permission.";
  }
  return `Rendered by the web SDK in your dApp. Shows ${FREQUENCY_PHRASE[frequency]}.`;
}

const ACCENTS = ["#4f46e5", "#f97316", "#0f172a", "#22c55e"];

/** Small schematic used inside a placement card. */
function PlacementGlyph({ placement }: { placement: PushPlacement }) {
  return (
    <div className="relative h-16 w-full overflow-hidden rounded-md bg-muted">
      {placement === "banner" ? (
        <div className="absolute inset-x-1 top-1 h-2 rounded-sm bg-primary/70" />
      ) : null}
      {placement === "modal" ? (
        <div className="absolute left-1/2 top-1/2 h-6 w-10 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-primary/70" />
      ) : null}
      {placement === "slide-in" ? (
        <div className="absolute bottom-1 right-1 h-5 w-8 rounded-sm bg-primary/70" />
      ) : null}
      {placement === "inline" ? (
        <div className="absolute left-1/2 top-1/2 h-3 w-12 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-primary/70" />
      ) : null}
      {placement === "mobile-push" ? (
        <div className="absolute left-1/2 top-1 h-14 w-8 -translate-x-1/2 rounded-md border border-border bg-background">
          <div className="mx-auto mt-3 h-2 w-5 rounded-sm bg-primary/70" />
        </div>
      ) : null}
    </div>
  );
}

/** The notification card shared by the modal/banner/slide-in/inline previews. */
function NotificationCard({
  title,
  body,
  ctaLabel,
  accent,
  dismissible,
  brandMark,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  accent: string;
  dismissible: boolean;
  brandMark: string;
}) {
  return (
    <div className="w-full rounded-xl border border-border bg-card p-4 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold text-white"
          style={{ backgroundColor: accent }}
        >
          {brandMark}
        </span>
        {dismissible ? (
          <XMarkIcon
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-muted-foreground"
          />
        ) : null}
      </div>
      <div className="mt-3 text-sm font-semibold text-foreground">
        {title || "Notification title"}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {body || "Your message preview shows here."}
      </p>
      {ctaLabel ? (
        <div className="mt-3">
          <span
            className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-white"
            style={{ backgroundColor: accent }}
          >
            {ctaLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** A mock browser frame the web placements render inside. */
function BrowserFrame({
  domain,
  children,
}: {
  domain: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/40">
      <div className="flex items-center gap-2 border-b border-border bg-background/60 px-3 py-2">
        <span className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
        </span>
        <span className="ml-1 truncate rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          {domain}
        </span>
        <span className="ml-auto rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          0x1A2b…9F3e
        </span>
      </div>
      <div className="relative min-h-[240px] p-4">{children}</div>
    </div>
  );
}

/**
 * Live in-app notification preview, rendered per placement. Shared by the
 * compose step and the review step so both show the same thing.
 */
export function InAppPreview({
  placement,
  title,
  body,
  ctaLabel,
  accent,
  dismissible = true,
  domain = "your-dapp.com",
  brandMark = "APP",
}: {
  placement: PushPlacement;
  title: string;
  body: string;
  ctaLabel: string;
  accent: string;
  dismissible?: boolean;
  /** The org's verified domain shown in the mock browser chrome. */
  domain?: string;
  /** Short brand mark (org initials) shown on the notification badge. */
  brandMark?: string;
}) {
  const card = (
    <NotificationCard
      title={title}
      body={body}
      ctaLabel={ctaLabel}
      accent={accent}
      dismissible={dismissible}
      brandMark={brandMark}
    />
  );

  if (placement === "mobile-push") {
    return (
      <div className="flex min-h-[240px] items-start justify-center rounded-xl border border-border bg-muted/40 p-4">
        <div className="w-full max-w-xs rounded-2xl border border-border bg-card p-3 shadow-lg">
          <div className="flex items-start gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              {brandMark}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold text-foreground">
                  {title || "Notification title"}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  now
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {body || "Your message preview shows here."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserFrame domain={domain}>
      {/* faux page content behind the notification */}
      <div className="space-y-2" aria-hidden="true">
        <div className="h-2 w-2/3 rounded bg-muted-foreground/15" />
        <div className="h-2 w-1/2 rounded bg-muted-foreground/15" />
      </div>

      {placement === "modal" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-foreground/10 p-4">
          <div className="w-full max-w-[240px]">{card}</div>
        </div>
      ) : null}
      {placement === "banner" ? (
        <div className="absolute inset-x-3 top-3">{card}</div>
      ) : null}
      {placement === "slide-in" ? (
        <div className="absolute bottom-3 right-3 w-full max-w-[220px]">
          {card}
        </div>
      ) : null}
      {placement === "inline" ? (
        <div className="mt-3 w-full max-w-[240px]">{card}</div>
      ) : null}
    </BrowserFrame>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-foreground">
      {children}
    </label>
  );
}

export interface InAppMessageStepProps {
  form: UseFormReturn<CampaignFormData>;
  /** The org's verified domain, shown in the preview's mock browser chrome. */
  appDomain?: string;
  /** Short brand mark (org initials) for the notification badge. */
  brandMark?: string;
}

/**
 * Step 2 for in-app push campaigns: a purpose-built notification composer with
 * a live, placement-aware preview. Title maps to `emailSubject` (the shared
 * push title); the rest of the display/delivery settings are frontend-only
 * until the in-app settings API ships.
 */
export function InAppMessageStep({
  form,
  appDomain = "your-dapp.com",
  brandMark = "APP",
}: InAppMessageStepProps) {
  const placement = (form.watch("pushPlacement") ?? "modal") as PushPlacement;
  const title = form.watch("emailSubject") ?? "";
  const body = form.watch("pushBody") ?? "";
  const ctaLabel = form.watch("pushCtaLabel") ?? "";
  const ctaUrl = form.watch("pushCtaUrl") ?? "";
  // Mirror the backend: reject dangerous URL schemes on the CTA (the backend
  // refuses javascript:/data:/vbscript:/file:/blob: - 422 / dropped field).
  const ctaUrlError = /^\s*(javascript|data|vbscript|file|blob):/i.test(ctaUrl)
    ? "That link type isn't allowed. Use https://, a relative path (/settings), mailto:, or a deep link (myapp://…)."
    : "";
  const accent = form.watch("pushAccent") ?? ACCENTS[0];
  const dismissible = form.watch("pushDismissible") ?? true;
  const frequency = (form.watch("pushFrequency") ??
    "once-per-wallet") as PushFrequency;
  const delivery = form.watch("pushDelivery") ?? "wait-for-connect";

  // `as never` sidesteps react-hook-form's path-value generic; every call
  // below passes a string or boolean for a known field.
  const set = (key: keyof CampaignFormData, value: string | boolean) =>
    form.setValue(key, value as never, { shouldDirty: true });

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          What are you sending?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Write the notification and set where it opens.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        {/* ---- Composer ---- */}
        <div className="space-y-6">
          {/* Where it appears */}
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              Where it appears
            </p>
            <div className="grid grid-cols-2 gap-3">
              {PLACEMENTS.map((p) => {
                const active = placement === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => set("pushPlacement", p.key)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-card hover:border-primary/40"
                    )}
                  >
                    <PlacementGlyph placement={p.key} />
                    <div className="mt-2 text-sm font-medium text-foreground">
                      {p.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.desc}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {PLACEMENT_BLURB[placement]}
            </p>
          </div>

          {/* Title */}
          <div>
            <FieldLabel>Title</FieldLabel>
            <div className="relative">
              <Input
                value={title}
                onChange={(e) => set("emailSubject", e.target.value)}
                placeholder="Your notification title"
                maxLength={placement === "mobile-push" ? 48 : 80}
                className="h-10 rounded-xl pr-12"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {title.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {placement === "mobile-push"
                ? "Under 48 characters - longer titles clip on the lock screen."
                : "One line reads best in a banner or slide-in."}
            </p>
          </div>

          {/* Message */}
          <div>
            <FieldLabel>Message</FieldLabel>
            <Textarea
              value={body}
              onChange={(e) => set("pushBody", e.target.value)}
              placeholder="Write your message…"
              rows={3}
              className="rounded-xl"
            />
          </div>

          {placement === "mobile-push" ? (
            <div>
              <FieldLabel>Deep link</FieldLabel>
              <Input
                value={ctaUrl}
                onChange={(e) => set("pushCtaUrl", e.target.value)}
                placeholder="https://yourapp.com/page"
                className="h-10 rounded-xl font-mono text-sm"
              />
              {ctaUrlError ? (
                <p className="mt-1 text-xs text-destructive">{ctaUrlError}</p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Where the app opens when the notification is tapped.
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Button label + link */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Button label</FieldLabel>
                  <Input
                    value={ctaLabel}
                    onChange={(e) => set("pushCtaLabel", e.target.value)}
                    placeholder="Open app"
                    className="h-10 rounded-xl"
                  />
                </div>
                <div>
                  <FieldLabel>Button link</FieldLabel>
                  <Input
                    value={ctaUrl}
                    onChange={(e) => set("pushCtaUrl", e.target.value)}
                    placeholder="https://yourapp.com/page"
                    className="h-10 rounded-xl font-mono text-sm"
                  />
                  {ctaUrlError ? (
                    <p className="mt-1 text-xs text-destructive">
                      {ctaUrlError}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* When it fires */}
              <div>
                <FieldLabel>When it fires</FieldLabel>
                <Select
                  value={form.watch("pushTrigger") ?? "wallet-connect"}
                  onValueChange={(v) => set("pushTrigger", v)}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="wallet-connect">
                      When a wallet connects
                    </SelectItem>
                    <SelectItem value="page-view">On page view</SelectItem>
                    <SelectItem value="manual">Manually</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Show + Accent */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Show</FieldLabel>
                  <Select
                    value={form.watch("pushFrequency") ?? "once-per-wallet"}
                    onValueChange={(v) => set("pushFrequency", v)}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="once-per-wallet">
                        Once per wallet
                      </SelectItem>
                      <SelectItem value="once-per-session">
                        Once per session
                      </SelectItem>
                      <SelectItem value="every-time">Every visit</SelectItem>
                      <SelectItem value="until-dismissed">
                        Until dismissed
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Accent</FieldLabel>
                  <div className="flex items-center gap-2">
                    {ACCENTS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Accent ${color}`}
                        onClick={() => set("pushAccent", color)}
                        className={cn(
                          "h-9 w-9 rounded-lg border-2 transition-transform",
                          accent === color
                            ? "border-primary"
                            : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Dismissible */}
              <div className="flex items-center justify-between gap-4">
                <FieldLabel>Dismissible</FieldLabel>
                <Switch
                  checked={dismissible}
                  onCheckedChange={(v) => set("pushDismissible", v)}
                />
              </div>

              {/* Delivery */}
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">
                  Delivery
                </p>
                <div className="space-y-3">
                  {(
                    [
                      {
                        key: "wait-for-connect" as const,
                        title: "Wait for connect",
                        desc: "Queue per wallet and fire on their next session. Reaches wallets who aren't online now.",
                      },
                      {
                        key: "only-now" as const,
                        title: "Only right now",
                        desc: "Deliver only to wallets connected at send time. Everyone else is skipped.",
                      },
                    ] as const
                  ).map((opt) => {
                    const active =
                      (form.watch("pushDelivery") ?? "wait-for-connect") ===
                      opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => set("pushDelivery", opt.key)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                          active
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border bg-card hover:border-primary/40"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                            active ? "border-primary" : "border-border"
                          )}
                        >
                          {active ? (
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          ) : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-foreground">
                            {opt.title}
                          </span>
                          <span className="block text-xs leading-relaxed text-muted-foreground">
                            {opt.desc}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expires + Max per session - only queued (wait-for-connect)
                  delivery has a lifespan/cap; "only right now" fires once. */}
              {delivery === "wait-for-connect" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Expires after</FieldLabel>
                    <Select
                      value={form.watch("pushExpiresDays") ?? "14"}
                      onValueChange={(v) => set("pushExpiresDays", v)}
                    >
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="3">3 days</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Stale messages shouldn&apos;t greet a wallet months later.
                    </p>
                  </div>
                  <div>
                    <FieldLabel>Max per session</FieldLabel>
                    <Select
                      value={form.watch("pushMaxPerSession") ?? "1"}
                      onValueChange={(v) => set("pushMaxPerSession", v)}
                    >
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="1">1 message</SelectItem>
                        <SelectItem value="2">2 messages</SelectItem>
                        <SelectItem value="3">3 messages</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Stops several campaigns stacking on one visit.
                    </p>
                  </div>
                </div>
              ) : null}

              <p className="text-xs leading-relaxed text-muted-foreground">
                {delivery === "only-now"
                  ? "Lowest reach - most wallets won't be connected the moment you press send."
                  : "This is why in-app beats email on view rate: the message is waiting when they arrive, not competing in an inbox."}
              </p>
            </>
          )}
        </div>

        {/* ---- Preview ---- */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-sm font-medium text-foreground">
            Preview · {PLACEMENT_LABEL[placement]}
          </p>
          <InAppPreview
            placement={placement}
            title={title}
            body={body}
            ctaLabel={ctaLabel}
            accent={accent}
            dismissible={dismissible}
            domain={appDomain}
            brandMark={brandMark}
          />
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {previewBlurb(placement, frequency)}
          </p>
        </div>
      </div>
    </div>
  );
}
