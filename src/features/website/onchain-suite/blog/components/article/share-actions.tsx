"use client";

import { CheckIcon, LinkIcon } from "@heroicons/react/20/solid";
import { useEffect, useState } from "react";

import { shareOnLinkedInUrl, shareOnXUrl } from "../../utils/share";

/* Brand marks aren't in Heroicons; these are the networks' own glyphs. */
function XGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

/**
 * Copy link, share on X, share on LinkedIn. Plain links to each network's own
 * composer: no third-party scripts, nothing loaded until the reader clicks.
 */
export function ShareActions({
  url,
  title,
  layout,
}: {
  url: string;
  title: string;
  layout: "column" | "row";
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  // Clipboard can be refused (permissions, insecure context); the URL is still
  // in the address bar, so a refusal just leaves the button as it was.
  const copy = () => {
    navigator.clipboard
      ?.writeText(url)
      .then(() => setCopied(true))
      .catch(() => undefined);
  };

  return (
    <div className={`ba-share ba-share--${layout}`}>
      <button
        type="button"
        className="ba-share-btn"
        onClick={copy}
        aria-label={copied ? "Link copied" : "Copy link"}
        title={copied ? "Copied" : "Copy link"}
      >
        {copied ? (
          <CheckIcon aria-hidden="true" className="ba-share-icon" />
        ) : (
          <LinkIcon aria-hidden="true" className="ba-share-icon" />
        )}
      </button>
      <a
        className="ba-share-btn"
        href={shareOnXUrl(url, title)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
        title="Share on X"
      >
        <span className="ba-share-icon ba-share-icon--brand">
          <XGlyph />
        </span>
      </a>
      <a
        className="ba-share-btn"
        href={shareOnLinkedInUrl(url)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on LinkedIn"
        title="Share on LinkedIn"
      >
        <span className="ba-share-icon ba-share-icon--brand">
          <LinkedInGlyph />
        </span>
      </a>
    </div>
  );
}
