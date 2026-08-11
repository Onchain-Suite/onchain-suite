"use client";

import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  CheckIcon,
  EnvelopeIcon,
  PlayCircleIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

import "./landing-v2.css";
import { DateTimePicker } from "./datetime-picker";
import { submitEarlyAccess } from "./early-access.service";
import { Reveal } from "./primitives";
import { PageShell } from "./shared";

const CONTACT_EMAIL = "onchainsuite@gmail.com";

const REASONS = [
  "Churn win-back",
  "Lifecycle automations",
  "On-chain campaigns",
  "Audience & intelligence",
  "Email + on-chain combined",
  "In-app push notifications",
  "Something else",
];

const inputCls =
  "w-full rounded-xl border bg-white px-3.5 py-2.5 text-[14px] t-ink outline-none transition-colors focus:border-[color:var(--acc)] focus:ring-2 focus:ring-[color:color-mix(in_oklab,var(--acc)_20%,transparent)]";

/** Human-readable label for a stored ISO preferred-time. */
function formatPreferred(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Build a "Add to Google Calendar" link that prefills a 30-min intro call. */
function googleCalendarUrl(opts: {
  protocol: string;
  reasons: string[];
  preferredTime?: string;
}) {
  const title = `OnchainSuite intro call${opts.protocol ? ` - ${opts.protocol}` : ""}`;
  const detailLines = [
    "20–30 min walkthrough of OnchainSuite on your own on-chain data.",
    opts.reasons.length ? `Focus: ${opts.reasons.join(", ")}.` : "",
    `We'll email you to confirm. Questions: ${CONTACT_EMAIL}`,
  ].filter(Boolean);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details: detailLines.join("\n"),
  });

  if (opts.preferredTime) {
    const start = new Date(opts.preferredTime);
    if (!Number.isNaN(start.getTime())) {
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const fmt = (d: Date) =>
        d
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d{3}/, "");
      params.set("dates", `${fmt(start)}/${fmt(end)}`);
    }
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function Form() {
  const [name, setName] = useState("");
  const [protocol, setProtocol] = useState("");
  const [email, setEmail] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);
  const [preferredTime, setPreferredTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // prefill the email passed from the hero form (?email=)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get("email");
    if (e) setEmail(e);
  }, []);

  const toggleReason = (r: string) =>
    setReasons((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );

  const valid =
    name.trim().length > 0 && protocol.trim().length > 0 && email.includes("@");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    await submitEarlyAccess({
      email: email.trim(),
      name: name.trim(),
      protocol: protocol.trim(),
      reasons,
      preferredTime: preferredTime || undefined,
      notes: notes.trim() || undefined,
      source: "early-access",
    });
    setSubmitting(false);
    setDone(true);
  };

  if (done) {
    const mailSubject = encodeURIComponent(
      `OnchainSuite intro call - ${protocol || "our protocol"}`
    );
    const mailBody = encodeURIComponent(
      `Hi OnchainSuite team,\n\nWe'd like an intro call.\n\nName: ${name}\nProtocol: ${protocol}\nEmail: ${email}${
        reasons.length ? `\nFocus: ${reasons.join(", ")}` : ""
      }${preferredTime ? `\nPreferred time: ${formatPreferred(preferredTime)}` : ""}\n`
    );
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card flex flex-col items-center p-8 text-center md:p-10"
      >
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 340, damping: 18 }}
        >
          <CheckCircleIcon className="h-14 w-14 t-ok" aria-hidden="true" />
        </motion.span>
        <h3 className="mt-4 text-[22px] font-semibold t-ink">
          Request received, {name ? name.split(" ")[0] : "thank you"} 🎉
        </h3>
        <p className="mt-2 max-w-md text-[14px] leading-relaxed t-muted">
          We&apos;ve registered{" "}
          <span className="font-medium t-ink2">{email || "your email"}</span>
          {protocol ? (
            <>
              {" "}
              for <span className="font-medium t-ink2">{protocol}</span>
            </>
          ) : null}
          . We&apos;ll <span className="font-medium t-ink2">email you</span>{" "}
          shortly to confirm a 20-minute intro call on your own on-chain data.
          Add a placeholder to your calendar so you don&apos;t miss it:
        </p>

        <div className="mt-6 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
          <a
            href={googleCalendarUrl({ protocol, reasons, preferredTime })}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
            Add to Google Calendar
          </a>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${mailSubject}&body=${mailBody}`}
            className="btn btn-ghost"
          >
            <EnvelopeIcon className="h-4 w-4" aria-hidden="true" />
            Email us directly
          </a>
        </div>
        <Link
          href="/"
          className="mt-4 text-[12.5px] font-medium t-muted transition-colors hover:text-[color:var(--acc)]"
        >
          ← Back to home
        </Link>
        <p className="mt-4 text-[11.5px] t-muted2">
          We onboard a handful of teams each week. No spam, ever.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5 md:p-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium t-muted">
            Full name
          </span>
          <input
            className={inputCls}
            style={{ borderColor: "var(--line)" }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium t-muted">
            Protocol name
          </span>
          <input
            className={inputCls}
            style={{ borderColor: "var(--line)" }}
            value={protocol}
            onChange={(e) => setProtocol(e.target.value)}
            placeholder="Acme Protocol"
            required
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-[12px] font-medium t-muted">
          Work email
        </span>
        <input
          type="email"
          className={inputCls}
          style={{ borderColor: "var(--line)" }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@protocol.xyz"
          required
        />
      </label>

      <div>
        <span className="mb-2 block text-[12px] font-medium t-muted">
          What do you want to use OnchainSuite for?{" "}
          <span className="t-muted2">(optional - choose all that apply)</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((u) => {
            const on = reasons.includes(u);
            return (
              <button
                key={u}
                type="button"
                aria-pressed={on}
                onClick={() => toggleReason(u)}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors"
                style={
                  on
                    ? {
                        borderColor: "var(--acc)",
                        background: "var(--acc-soft)",
                        color: "var(--acc)",
                      }
                    : {
                        borderColor: "var(--line)",
                        color: "var(--muted)",
                        background: "#fff",
                      }
                }
              >
                {on ? (
                  <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
                ) : null}
                {u}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-[12px] font-medium t-muted">
          Preferred call time{" "}
          <span className="t-muted2">(optional - pick a day &amp; slot)</span>
        </span>
        <DateTimePicker value={preferredTime} onChange={setPreferredTime} />
        {preferredTime ? (
          <p className="mt-1.5 text-[12px] t-acc">
            Selected: {formatPreferred(preferredTime)}
          </p>
        ) : null}
      </div>

      <label className="block">
        <span className="mb-1 block text-[12px] font-medium t-muted">
          Anything else? (optional)
        </span>
        <textarea
          className={`${inputCls} min-h-[80px] resize-y`}
          style={{ borderColor: "var(--line)" }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Tell us about your protocol and goals…"
        />
      </label>

      <button
        type="submit"
        disabled={!valid || submitting}
        className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Request my intro call"}
        {!submitting ? (
          <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        ) : null}
      </button>
      <p className="text-center text-[12px] t-muted2">
        We&apos;ll email you to confirm. No spam, ever.
      </p>
    </form>
  );
}

export function EarlyAccessPage() {
  return (
    <PageShell>
      <section className="relative overflow-hidden pb-16 pt-16 md:pt-20">
        <div className="grid-bg" />
        <div
          className="orb"
          style={{
            width: 420,
            height: 420,
            left: -90,
            top: -60,
            background: "color-mix(in oklab, var(--acc) 26%, transparent)",
          }}
        />
        <div className="wrap relative grid items-start gap-12 lg:grid-cols-[1fr_1fr]">
          <div className="lg:sticky lg:top-28">
            <Reveal>
              <span className="eyebrow">Early access</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h1
                className="mt-5 font-semibold tracking-tight"
                style={{
                  fontSize: "clamp(2.1rem, 4.4vw, 3.1rem)",
                  lineHeight: 1.06,
                }}
              >
                Get early access to <span className="grad">OnchainSuite.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-5 max-w-md text-[16px] leading-relaxed t-muted">
                Tell us about your protocol and request a 20-minute intro call.
                We&apos;ll email you to confirm and show you the platform on
                your own on-chain data.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="card mt-8 flex items-center gap-4 p-4">
                <PlayCircleIcon
                  className="h-10 w-10 shrink-0 t-acc"
                  aria-hidden="true"
                />
                <div>
                  <div className="text-[14px] font-semibold t-ink">
                    Watch the product demo
                    <span className="ml-2 align-middle text-[11px] font-normal t-muted2">
                      demo coming soon
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12.5px] leading-snug t-muted">
                    A 2-minute tour: live on-chain triggers, the Plays library,
                    and the Intelligence layer.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <Form />
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}

export default EarlyAccessPage;
