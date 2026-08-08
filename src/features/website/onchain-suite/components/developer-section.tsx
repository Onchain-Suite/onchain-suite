"use client";

import { CheckIcon, ClipboardIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

import { cn } from "@/lib/utils";

type Snippet = { id: string; label: string; language: string; code: string };

const SNIPPETS: Snippet[] = [
  {
    id: "install",
    label: "Install",
    language: "bash",
    code: `npm i @onchainsuite/sdk`,
  },
  {
    id: "initialize",
    label: "Initialize",
    language: "ts",
    code: `import { OnchainSuite } from "@onchainsuite/sdk";

// Publishable key from Dashboard → Integrations → In-App
const os = new OnchainSuite("pk_live_xxx");

// Wallet signs in - notifications start showing automatically
await os.start();`,
  },
  {
    id: "send",
    label: "Send",
    language: "ts",
    code: `// Server-side - never expose your secret key in the browser
await fetch("https://api.onchainsuite.com/api/v1/inapp/push", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer sk_live_xxx",
  },
  body: JSON.stringify({
    walletAddress: "0xabc...",
    title: "GM 👋",
    body: "Your rewards are ready to claim.",
    ctaLabel: "Claim",
    ctaUrl: "https://app.myprotocol.xyz/rewards",
  }),
});`,
  },
];

/**
 * Landing-page developer section: a three-tab code sample (Install → Initialize →
 * Send) showing how quickly a protocol integrates in-app notifications. Static +
 * lightweight (no syntax-highlighter dependency); theme-token styled.
 */
export function DeveloperSection() {
  const [active, setActive] = useState<string>(SNIPPETS[0].id);
  const [copied, setCopied] = useState(false);
  const current = SNIPPETS.find((s) => s.id === active) ?? SNIPPETS[0];

  const copy = () => {
    navigator.clipboard.writeText(current.code).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="w-full bg-background py-24">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-medium text-primary">
            For developers
          </p>
          <h2 className="text-3xl font-semibold text-foreground md:text-4xl">
            Notifications in three lines
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Drop the SDK into any dApp - wallet-authenticated, real-time, and
            fully themeable. Send from your backend with one call.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-2">
            <div className="flex">
              {SNIPPETS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(s.id)}
                  className={cn(
                    "px-4 py-3 text-sm font-medium transition-colors",
                    active === s.id
                      ? "border-b-2 border-primary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={copy}
              aria-label="Copy code"
              className="mr-2 flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {copied ? (
                <CheckIcon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ClipboardIcon className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="overflow-x-auto p-5 text-left text-sm leading-relaxed">
            <code className="font-mono text-foreground">{current.code}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
