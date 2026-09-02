"use client";

import {
  ChevronDownIcon,
  ChevronUpIcon,
  ShieldCheckIcon,
  TrashIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

import { FIELD_CATALOG, radiusForCorners } from "../forms.catalog";
import {
  type CaptureFieldSpec,
  type FormAppearance,
  type FormBg,
  type FormDisplaySettings,
  readDisplaySettings,
  readFormMeta,
} from "../forms.service";

/** X (Twitter) glyph - brand mark, kept inline so we ship no icon font. */
function XGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** Farcaster arch glyph. */
function FarcasterGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M4 3h16v3.2h-2.1V21h-3.3v-7.6c0-1.6-1.2-2.9-2.6-2.9s-2.6 1.3-2.6 2.9V21H6.1V6.2H4V3z" />
    </svg>
  );
}

export interface FormRendererLive {
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  walletAddress: string | null;
  onConnectWallet: () => void;
  connectingWallet?: boolean;
  linkedChannels: Record<string, boolean>;
  onLinkChannel: (type: "x" | "farcaster") => void;
  consent: boolean;
  onConsent: (v: boolean) => void;
  onSubmit: () => void;
  submitting?: boolean;
  error?: string | null;
  /** Optional bot-check slot rendered just above the submit button. */
  captcha?: ReactNode;
}

/** Builder-only: makes preview field blocks selectable / reorderable. */
export interface FormRendererEditing {
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onMove: (key: string, dir: -1 | 1) => void;
  onRemove: (key: string) => void;
}

interface FormRendererProps {
  name: string;
  fields: CaptureFieldSpec[];
  /** Raw settings blob (display + appearance read out of it). */
  settings?: Record<string, unknown>;
  displayOverride?: FormDisplaySettings;
  /** Card presentation; falls back to `settings.meta.appearance`. */
  appearance?: FormAppearance;
  /** Overrides the display submit label (e.g. from capture type). */
  submitLabel?: string;
  zkEnabled: boolean;
  /** Provide to make the form interactive (hosted page). Omit = static preview. */
  live?: FormRendererLive;
  /** Provide to make preview blocks editable (builder). */
  editing?: FormRendererEditing;
  device?: "desktop" | "mobile";
  className?: string;
}

interface Theme {
  card: string;
  text: string;
  sub: string;
  fieldText: string;
  inputBg: string;
  inputBorder: string;
  border: string;
}

function themeFor(bg: FormBg): Theme {
  if (bg === "dark") {
    return {
      card: "#0e0f12",
      text: "#ffffff",
      sub: "rgba(255,255,255,0.62)",
      fieldText: "rgba(255,255,255,0.82)",
      inputBg: "rgba(255,255,255,0.04)",
      inputBorder: "rgba(255,255,255,0.15)",
      border: "rgba(255,255,255,0.10)",
    };
  }
  if (bg === "tint") {
    return {
      card: "#f3f4fb",
      text: "#0f172a",
      sub: "#64748b",
      fieldText: "#334155",
      inputBg: "#ffffff",
      inputBorder: "#dde1ee",
      border: "#e4e7f2",
    };
  }
  return {
    card: "#ffffff",
    text: "#0f172a",
    sub: "#64748b",
    fieldText: "#334155",
    inputBg: "#f8fafc",
    inputBorder: "#e2e8f0",
    border: "#eef1f5",
  };
}

const shortWallet = (addr: string) =>
  addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;

/**
 * The wallet-first capture form. One renderer drives the builder's live
 * preview (static or `editing`) and the hosted `/f/[token]` page (`live`).
 * Presentation (theme, corners, button, hero) comes from `appearance`.
 */
export function FormRenderer({
  name,
  fields,
  settings,
  displayOverride,
  appearance,
  submitLabel,
  zkEnabled,
  live,
  editing,
  device = "desktop",
  className,
}: FormRendererProps) {
  const display = displayOverride
    ? { ...readDisplaySettings(settings), ...displayOverride }
    : readDisplaySettings(settings);
  const look = appearance ?? readFormMeta(settings).appearance;
  const accent = look.accent || display.accent;
  const t = themeFor(look.bg);
  const radius = radiusForCorners(look.corners);
  const brand = display.brandName || name || "Your brand";
  const outline = look.button === "outline";

  const specs =
    fields.length > 0
      ? fields
      : [
          { key: "wallet", type: "wallet" as const, required: true },
          { key: "email", type: "email" as const, required: true },
        ];

  const submitText = submitLabel ?? display.submitLabel;

  const renderField = (field: CaptureFieldSpec) => {
    const { key } = field;
    const type = field.type ?? "text";
    const { required } = field;

    if (type === "wallet") {
      const walletAddress = live?.walletAddress;
      return (
        <button
          type="button"
          onClick={live?.onConnectWallet}
          disabled={!live || live?.connectingWallet}
          style={{
            backgroundColor: outline ? "transparent" : accent,
            color: outline ? accent : "#fff",
            border: outline ? `1.5px solid ${accent}` : "none",
            borderRadius: radius,
          }}
          className={cn(
            "flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-opacity",
            !live && "cursor-default",
            live && "hover:opacity-90 disabled:opacity-60"
          )}
        >
          <WalletIcon className="size-4" aria-hidden="true" />
          {walletAddress ? shortWallet(walletAddress) : "Connect wallet"}
        </button>
      );
    }

    if (type === "x" || type === "farcaster") {
      const active = live?.linkedChannels?.[type] ?? false;
      const Glyph = type === "x" ? XGlyph : FarcasterGlyph;
      const label =
        type === "x"
          ? active
            ? "X linked"
            : "Link X (Twitter)"
          : active
            ? "Farcaster linked"
            : "Link Farcaster";
      return (
        <button
          type="button"
          onClick={live ? () => live.onLinkChannel(type) : undefined}
          disabled={!live}
          style={{
            backgroundColor: active ? `${accent}1a` : t.inputBg,
            borderColor: active ? accent : t.inputBorder,
            color: active ? accent : t.fieldText,
            borderRadius: radius,
          }}
          className={cn(
            "flex w-full items-center justify-center gap-2 border px-4 py-3 text-sm font-medium",
            !live && "cursor-default"
          )}
        >
          <Glyph className="size-4" />
          {label}
        </button>
      );
    }

    if (type === "consent") {
      return (
        <label
          className="flex cursor-pointer items-start gap-2 text-xs leading-relaxed"
          style={{ color: t.sub }}
        >
          <input
            type="checkbox"
            checked={live ? live.consent : true}
            onChange={(e) => live?.onConsent(e.target.checked)}
            disabled={!live}
            style={{ accentColor: accent }}
            className="mt-0.5 size-4 shrink-0"
          />
          <span>{field.label ?? display.consentLabel}</span>
        </label>
      );
    }

    // email / text
    return (
      <div className="space-y-1">
        <label
          className="block text-sm font-medium"
          style={{ color: t.fieldText }}
        >
          {field.label ?? (type === "email" ? "Email address" : field.key)}
          {required ? <span style={{ color: accent }}> *</span> : null}
        </label>
        <input
          type={type === "email" ? "email" : "text"}
          value={live?.values[key] ?? ""}
          onChange={(e) => live?.onChange(key, e.target.value)}
          readOnly={!live}
          required={required}
          placeholder={type === "email" ? "you@wallet.xyz" : field.label}
          style={{
            backgroundColor: t.inputBg,
            borderColor: t.inputBorder,
            color: t.text,
            borderRadius: radius,
          }}
          className="w-full border px-3 py-2.5 text-sm focus:outline-none"
        />
      </div>
    );
  };

  return (
    <div
      style={{
        backgroundColor: t.card,
        color: t.text,
        borderColor: t.border,
        borderRadius: radius + 6,
      }}
      className={cn(
        "mx-auto w-full overflow-hidden border",
        device === "desktop" ? "max-w-md" : "max-w-[340px]",
        className
      )}
    >
      {look.hero ? (
        <div
          className="flex h-24 items-center justify-center text-xs font-medium text-white/80"
          style={{ background: "linear-gradient(135deg,#4351d1,#1e2350)" }}
        >
          Hero image
        </div>
      ) : null}

      <div className="p-6">
        {/* Brand */}
        <div className="mb-4 flex items-center gap-2">
          <span
            style={{ backgroundColor: accent }}
            className="flex size-7 items-center justify-center rounded-md text-sm font-bold text-white"
          >
            {brand.charAt(0).toUpperCase()}
          </span>
          <span className="text-sm font-semibold">{brand}</span>
        </div>

        <h2 className="text-xl font-bold">{display.headline}</h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: t.sub }}>
          {display.description}
        </p>

        <div className="mt-5 space-y-3">
          {specs.map((field) => {
            const type = field.type ?? "text";
            if (!editing) {
              return <div key={field.key}>{renderField(field)}</div>;
            }
            const selected = editing.selectedKey === field.key;
            const fixed = FIELD_CATALOG[type]?.fixed ?? false;
            return (
              <EditBlock
                key={field.key}
                selected={selected}
                accent={accent}
                fixed={fixed}
                onSelect={() => editing.onSelect(field.key)}
                onUp={() => editing.onMove(field.key, -1)}
                onDown={() => editing.onMove(field.key, 1)}
                onRemove={() => editing.onRemove(field.key)}
              >
                {renderField(field)}
              </EditBlock>
            );
          })}

          {live?.error ? (
            <p className="text-xs text-red-400">{live.error}</p>
          ) : null}

          {live?.captcha ? (
            <div className="flex justify-center">{live.captcha}</div>
          ) : null}

          {/* Submit */}
          <button
            type="button"
            onClick={live?.onSubmit}
            disabled={!live || live?.submitting}
            style={{
              backgroundColor: outline ? "transparent" : accent,
              color: outline ? accent : "#fff",
              border: outline ? `1.5px solid ${accent}` : "none",
              borderRadius: radius,
            }}
            className={cn(
              "flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-opacity",
              !live && "cursor-default",
              live && "hover:opacity-90 disabled:opacity-60"
            )}
          >
            {live?.submitting ? "Verifying…" : submitText}
          </button>

          {zkEnabled || display.showZkNote ? (
            <p
              className="flex items-center justify-center gap-1.5 pt-1 text-center text-xs"
              style={{ color: t.sub }}
            >
              <ShieldCheckIcon
                className="size-3.5"
                style={{ color: accent }}
                aria-hidden="true"
              />
              Verified with a zero-knowledge proof - your identity is never
              exposed
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Wraps a preview field with a selection ring + reorder/delete tools. */
function EditBlock({
  children,
  selected,
  accent,
  fixed,
  onSelect,
  onUp,
  onDown,
  onRemove,
}: {
  children: ReactNode;
  selected: boolean;
  accent: string;
  fixed: boolean;
  onSelect: () => void;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  const ringStyle: CSSProperties = selected
    ? { boxShadow: `0 0 0 2px ${accent}` }
    : {};
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      style={ringStyle}
      className="group relative cursor-pointer rounded-lg p-1 transition-shadow hover:shadow-[0_0_0_1px_var(--border)]"
    >
      {children}
      <div className="absolute -right-1 -top-1 hidden items-center gap-0.5 rounded-md border border-border bg-background p-0.5 shadow-sm group-hover:flex">
        <button
          type="button"
          onClick={stop(onUp)}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted"
          aria-label="Move up"
        >
          <ChevronUpIcon className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={stop(onDown)}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted"
          aria-label="Move down"
        >
          <ChevronDownIcon className="size-3.5" />
        </button>
        {!fixed ? (
          <button
            type="button"
            onClick={stop(onRemove)}
            className="rounded p-0.5 text-destructive hover:bg-destructive/10"
            aria-label="Remove field"
          >
            <TrashIcon className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
