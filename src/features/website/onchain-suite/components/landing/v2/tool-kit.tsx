"use client";

import Link from "next/link";
import { type ReactNode } from "react";

import { Reveal } from "./primitives";

/* ---------- number helpers ---------- */

/** Parse a loosely-typed numeric field (strips $, commas, %) to a number. */
export const parseNum = (v: string) => {
  const n = Number(v.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
export const count = (n: number) => Math.round(n).toLocaleString();
export const pct1 = (n: number) =>
  Number.isFinite(n) ? `${n.toFixed(1)}%` : "-";
export const usd0 = (n: number) =>
  Number.isFinite(n) ? `$${Math.round(n).toLocaleString()}` : "-";
export const usdCompact = (n: number) => {
  if (!Number.isFinite(n)) return "-";
  const neg = n < 0;
  const a = Math.abs(n);
  const body =
    a >= 1000
      ? `$${(a / 1000).toFixed(a % 1000 === 0 ? 0 : 1)}k`
      : `$${count(a)}`;
  return neg ? `(${body})` : body;
};

/* ---------- shared chrome ---------- */

export function ToolBreadcrumb({ label }: { label: string }) {
  return (
    <div className="mono mb-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] t-muted2">
      <Link
        href="/tools"
        className="transition-colors hover:text-[color:var(--acc)]"
      >
        Tools
      </Link>
      <span aria-hidden="true">/</span>
      <span className="t-muted">{label}</span>
    </div>
  );
}

export function ToolHero({
  crumb,
  title,
  sub,
}: {
  crumb: string;
  title: string;
  sub: string;
}) {
  return (
    <>
      <ToolBreadcrumb label={crumb} />
      <h1 className="max-w-3xl text-[30px] font-semibold leading-tight tracking-tight t-ink sm:text-[40px]">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-[16px] leading-relaxed t-muted">
        {sub}
      </p>
    </>
  );
}

/** Labeled numeric input with an optional prefix/suffix and helper hint. */
export function ToolField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium t-ink2">{label}</span>
      <div
        className="mt-1.5 flex items-center gap-1 rounded-lg border px-3 py-2"
        style={{ borderColor: "var(--line)" }}
      >
        {prefix ? <span className="t-muted2">{prefix}</span> : null}
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(parseNum(e.target.value))}
          aria-label={label}
          className="w-full min-w-0 bg-transparent text-[15px] font-medium tabular-nums t-ink outline-none"
        />
        {suffix ? <span className="text-[13px] t-muted2">{suffix}</span> : null}
      </div>
      {hint ? (
        <span className="mt-1.5 block text-[12px] leading-snug t-muted2">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

/** Segmented control (e.g. Weekly / Monthly / Quarterly). */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      {label ? (
        <span className="text-[13px] font-medium t-ink2">{label}</span>
      ) : null}
      <div
        className="mt-1.5 inline-flex rounded-lg border p-0.5"
        style={{ borderColor: "var(--line)" }}
      >
        {options.map((o) => {
          const active = o === value;
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              className="rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors"
              style={{
                background: active ? "var(--ink)" : "transparent",
                color: active ? "#fff" : "var(--muted)",
              }}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** One worksheet line: label left, mono value right. */
export function WorksheetRow({
  k,
  v,
  muted,
}: {
  k: string;
  v: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-[13px] t-muted">{k}</span>
      <span
        className={`mono text-[13.5px] tabular-nums ${muted ? "t-muted2" : "t-ink"}`}
      >
        {v}
      </span>
    </div>
  );
}

/** A bordered surface card with an optional mono section label. */
export function ToolCard({
  label,
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`card p-6 ${className ?? ""}`}>
      {label ? (
        <div className="mono mb-4 text-[10.5px] uppercase tracking-[0.14em] t-muted2">
          {label}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/** Two-up prose explainer grid. Body paragraphs are split on blank lines. */
export function ToolExplainer({ items }: { items: [string, string][] }) {
  return (
    <div className="mt-12 grid gap-x-10 gap-y-10 md:grid-cols-2">
      {items.map(([h, b]) => (
        <Reveal key={h}>
          <h3 className="text-[17px] font-semibold t-ink">{h}</h3>
          {b.split("\n\n").map((p, i) => (
            <p
              key={p.slice(0, 32)}
              className={`text-[14px] leading-relaxed t-muted ${i === 0 ? "mt-2" : "mt-3"}`}
            >
              {p}
            </p>
          ))}
        </Reveal>
      ))}
    </div>
  );
}

/** Related-tools card row. */
export function RelatedTools({ items }: { items: [string, string, string][] }) {
  return (
    <>
      <div className="mono mb-5 mt-16 text-[11px] uppercase tracking-[0.14em] t-muted2">
        Related tools
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {items.map(([title, body, href]) => (
          <Link
            key={href}
            href={href}
            className="card block p-6 transition-colors hover:border-[color:var(--acc)]"
          >
            <div className="text-[15px] font-semibold t-ink">{title}</div>
            <p className="mt-2 text-[13.5px] leading-relaxed t-muted">{body}</p>
            <span className="mono mt-3 inline-block text-[12px] uppercase tracking-[0.1em] t-acc">
              Open tool →
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
