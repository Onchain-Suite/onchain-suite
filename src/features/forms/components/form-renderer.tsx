"use client";

import { ShieldCheckIcon, WalletIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  type CaptureFieldSpec,
  type FormDisplaySettings,
  readDisplaySettings,
} from "../forms.service";

/** X (Twitter) glyph — brand mark, kept inline so we ship no icon font. */
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
}

interface FormRendererProps {
  name: string;
  fields: CaptureFieldSpec[];
  /** Raw settings blob (display is read out of `settings.display`). */
  settings?: Record<string, unknown>;
  /** Override display without a settings blob (builder live edits). */
  displayOverride?: FormDisplaySettings;
  zkEnabled: boolean;
  /** Provide to make the form interactive (hosted page). Omit = static preview. */
  live?: FormRendererLive;
  device?: "desktop" | "mobile";
  className?: string;
}

const shortWallet = (addr: string) =>
  addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;

/**
 * The wallet-first capture form. One renderer drives both the builder's live
 * preview (static, `live` omitted) and the hosted `/f/[token]` page (`live`
 * provided). Layout, order and copy come from the field spec + display
 * settings so the two never drift.
 */
export function FormRenderer({
  name,
  fields,
  settings,
  displayOverride,
  zkEnabled,
  live,
  device = "desktop",
  className,
}: FormRendererProps) {
  const display = displayOverride
    ? { ...readDisplaySettings(settings), ...displayOverride }
    : readDisplaySettings(settings);
  const { accent } = display;
  const brand = display.brandName || name || "Your brand";

  const specs =
    fields.length > 0
      ? fields
      : [
          { key: "wallet", type: "wallet" as const, required: true },
          { key: "email", type: "email" as const, required: true },
        ];

  const accentBtn = (
    children: ReactNode,
    onClick?: () => void,
    disabled?: boolean
  ) => {
    const inactive = !live || disabled === true;
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={inactive}
        style={{ backgroundColor: accent }}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity",
          inactive && "cursor-default",
          live && "hover:opacity-90 disabled:opacity-60"
        )}
      >
        {children}
      </button>
    );
  };

  const ghostBtn = (
    children: ReactNode,
    onClick?: () => void,
    active?: boolean
  ) => (
    <button
      type="button"
      onClick={onClick}
      disabled={!live}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
        active
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : "border-white/15 bg-white/[0.03] text-white/90",
        live && !active && "hover:bg-white/[0.06]",
        !live && "cursor-default"
      )}
    >
      {children}
    </button>
  );

  return (
    <div
      className={cn(
        "mx-auto w-full rounded-2xl border border-white/10 bg-[#0e0f12] p-6 text-white",
        device === "desktop" ? "max-w-md" : "max-w-[340px]",
        className
      )}
    >
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
      <p className="mt-1 text-sm leading-relaxed text-white/60">
        {display.description}
      </p>

      <div className="mt-5 space-y-3">
        {specs.map((field) => {
          const { key } = field;
          const type = field.type ?? "text";
          const { required } = field;

          if (type === "wallet") {
            const walletAddress = live?.walletAddress;
            return (
              <div key={key}>
                {accentBtn(
                  walletAddress ? (
                    <>
                      <WalletIcon className="size-4" aria-hidden="true" />
                      {shortWallet(walletAddress)}
                    </>
                  ) : (
                    <>
                      <WalletIcon className="size-4" aria-hidden="true" />
                      Connect wallet
                    </>
                  ),
                  live?.onConnectWallet,
                  live?.connectingWallet
                )}
              </div>
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
              <div key={key}>
                {ghostBtn(
                  <>
                    <Glyph className="size-4" />
                    {label}
                  </>,
                  live ? () => live.onLinkChannel(type) : undefined,
                  active
                )}
              </div>
            );
          }

          if (type === "consent") {
            return (
              <label
                key={key}
                className="flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-white/70"
              >
                <input
                  type="checkbox"
                  checked={live ? live.consent : true}
                  onChange={(e) => live?.onConsent(e.target.checked)}
                  disabled={!live}
                  style={{ accentColor: accent }}
                  className="mt-0.5 size-4 shrink-0 rounded"
                />
                <span>{display.consentLabel}</span>
              </label>
            );
          }

          // email / text inputs
          return (
            <div key={key} className="space-y-1">
              <label className="block text-sm font-medium text-white/80">
                {field.label ??
                  (type === "email" ? "Email address" : field.key)}
                {required ? <span style={{ color: accent }}> *</span> : null}
              </label>
              <input
                type={type === "email" ? "email" : "text"}
                value={live?.values[key] ?? ""}
                onChange={(e) => live?.onChange(key, e.target.value)}
                readOnly={!live}
                required={required}
                placeholder={type === "email" ? "you@wallet.xyz" : field.label}
                className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
              />
            </div>
          );
        })}

        {live?.error ? (
          <p className="text-xs text-red-400">{live.error}</p>
        ) : null}

        {accentBtn(
          live?.submitting ? "Verifying…" : display.submitLabel,
          live?.onSubmit,
          live?.submitting
        )}

        {(zkEnabled || display.showZkNote) && (
          <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-xs text-white/40">
            <ShieldCheckIcon
              className="size-3.5 text-indigo-400"
              aria-hidden="true"
            />
            Verified with a zero-knowledge proof — your identity is never
            exposed
          </p>
        )}
      </div>
    </div>
  );
}
