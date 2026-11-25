"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

import "./consent-banner.css";
import {
  type ConsentChoice,
  getConsent,
  OPEN_PREFERENCES_EVENT,
  saveConsent,
} from "./consent";

type View = "hidden" | "notice" | "preferences";

const CATEGORIES: {
  key: keyof ConsentChoice;
  title: string;
  body: string;
}[] = [
  {
    key: "analytics",
    title: "Analytics",
    body: "Counts visits and which pages help, so we can improve the site. Google Analytics, Databuddy and PostHog.",
  },
  {
    key: "recordings",
    title: "Session recordings",
    body: "Replays and heatmaps of how pages are used. Typed text is always masked. Microsoft Clarity and Databuddy.",
  },
];

/**
 * Cookie consent banner, styled to the OnchainSuite brand (Electric Blue
 * #1727E0, Midnight #010F31, Cloud #F0F7FF, Instrument Sans).
 *
 * Shown until the visitor chooses. "Reject all" sits beside "Accept all" at
 * the same size, as the ICO expects. Reopened from the footer's "Cookie
 * settings" or the Cookie Policy page via `openConsentPreferences()`.
 * Never shown on the hosted capture form (`/f/*`), which loads no trackers.
 */
export function ConsentBanner() {
  const pathname = usePathname();
  const titleId = useId();
  const descId = useId();
  const [view, setView] = useState<View>("hidden");
  const [draft, setDraft] = useState<ConsentChoice>({
    analytics: false,
    recordings: false,
  });

  useEffect(() => {
    if (!getConsent()) setView("notice");
    const open = () => {
      const c = getConsent();
      setDraft({
        analytics: c?.analytics ?? false,
        recordings: c?.recordings ?? false,
      });
      setView("preferences");
    };
    window.addEventListener(OPEN_PREFERENCES_EVENT, open);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, open);
  }, []);

  if (view === "hidden" || pathname?.startsWith("/f/")) return null;

  const decide = (choice: ConsentChoice) => {
    setView("hidden");
    saveConsent(choice);
  };
  const all = { analytics: true, recordings: true };
  const none = { analytics: false, recordings: false };

  return (
    <section
      className="ocs-consent"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={descId}
      data-view={view}
    >
      <header className="ocs-consent__head">
        <span className="ocs-consent__badge" aria-hidden="true">
          <svg viewBox="0 0 20 20" width="16" height="16">
            <path
              d="M10 2.5a7.5 7.5 0 1 0 7.4 8.7 2.6 2.6 0 0 1-3.1-2.7 2.6 2.6 0 0 1-2.9-3A2.6 2.6 0 0 1 10 2.5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <circle cx="7" cy="9" r="1" fill="currentColor" />
            <circle cx="9.5" cy="13" r="1" fill="currentColor" />
            <circle cx="13" cy="12.5" r=".9" fill="currentColor" />
          </svg>
        </span>
        <h2 id={titleId} className="ocs-consent__title">
          {view === "preferences"
            ? "Cookie preferences"
            : "Your data, your call"}
        </h2>
        {view === "preferences" && (
          <button
            type="button"
            className="ocs-consent__close"
            aria-label="Close cookie preferences"
            onClick={() => setView(getConsent() ? "hidden" : "notice")}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </header>

      <p id={descId} className="ocs-consent__text">
        {view === "preferences"
          ? "Choose what we may use. Strictly necessary cookies keep the site working and are always on."
          : "We use optional analytics and session recordings to learn what works on our site. Nothing optional runs unless you say yes."}{" "}
        <a href="/cookies" className="ocs-consent__link">
          Cookie Policy
        </a>
      </p>

      {view === "preferences" && (
        <ul className="ocs-consent__list">
          <li className="ocs-consent__row">
            <div>
              <p className="ocs-consent__row-title">Strictly necessary</p>
              <p className="ocs-consent__row-body">
                Sign-in, security and remembering this choice.
              </p>
            </div>
            <span className="ocs-consent__always">Always on</span>
          </li>
          {CATEGORIES.map((c) => (
            <li key={c.key} className="ocs-consent__row">
              <div>
                <p
                  className="ocs-consent__row-title"
                  id={`${titleId}-${c.key}`}
                >
                  {c.title}
                </p>
                <p className="ocs-consent__row-body">{c.body}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draft[c.key]}
                aria-labelledby={`${titleId}-${c.key}`}
                className="ocs-consent__switch"
                onClick={() => setDraft((d) => ({ ...d, [c.key]: !d[c.key] }))}
              >
                <span className="ocs-consent__knob" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="ocs-consent__actions">
        {view === "preferences" ? (
          <>
            <button
              type="button"
              className="ocs-consent__btn"
              onClick={() => decide(draft)}
            >
              Save choices
            </button>
            <button
              type="button"
              className="ocs-consent__btn ocs-consent__btn--solid"
              onClick={() => decide(all)}
            >
              Accept all
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="ocs-consent__btn"
              onClick={() => decide(none)}
            >
              Reject all
            </button>
            <button
              type="button"
              className="ocs-consent__btn ocs-consent__btn--solid"
              onClick={() => decide(all)}
            >
              Accept all
            </button>
          </>
        )}
      </div>

      {view === "notice" && (
        <button
          type="button"
          className="ocs-consent__manage"
          onClick={() => setView("preferences")}
        >
          Manage preferences
        </button>
      )}
    </section>
  );
}

export default ConsentBanner;
