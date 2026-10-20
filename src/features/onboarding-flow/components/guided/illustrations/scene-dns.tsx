"use client";

import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";

import { FloatingChip, IllustrationShell } from "./illustration-frame";

const RECORDS: { type: string; label: string }[] = [
  { type: "TXT", label: "SPF" },
  { type: "TXT", label: "DKIM" },
  { type: "TXT", label: "DMARC" },
  { type: "CNAME", label: "Tracking" },
  { type: "MX", label: "Mail" },
];

/** Step 3 scene: the sending domain verified, so email leaves as the project rather than as us. */
export function SceneDns() {
  return (
    <IllustrationShell
      chips={
        <FloatingChip
          className="-bottom-4 -right-4"
          icon={ShieldCheckIcon}
          title="Verified"
          subtitle="mail.yourproject.com"
        />
      }
    >
      <div className="rounded-xl border border-border p-3">
        <div className="flex items-center justify-between">
          <p className="text-foreground font-mono text-xs font-medium">
            mail.yourproject.com
          </p>
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px] font-semibold">
            5 / 5 found
          </span>
        </div>
        <ul className="mt-3 space-y-1.5">
          {RECORDS.map((r) => (
            <li
              key={r.label}
              className="flex items-center gap-2.5 rounded-lg px-1 py-1"
            >
              <CheckCircleIcon
                aria-hidden
                className="text-primary h-4 w-4 shrink-0"
              />
              <span className="text-muted-foreground w-14 shrink-0 font-mono text-[11px]">
                {r.type}
              </span>
              <span className="text-foreground text-sm">{r.label}</span>
              <span className="bg-primary/5 text-primary ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium">
                Found
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-background rounded-xl border border-border p-3">
        <p className="text-muted-foreground text-[11px]">From</p>
        <p className="text-foreground text-sm font-semibold">
          Your project &lt;no-reply@mail.yourproject.com&gt;
        </p>
        <p className="text-muted-foreground mt-1 text-[11px]">
          Email now sends as you, not as us.
        </p>
      </div>
    </IllustrationShell>
  );
}
