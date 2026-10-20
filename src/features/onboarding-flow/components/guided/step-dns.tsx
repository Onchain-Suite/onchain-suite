"use client";

/**
 * The sending domain. Six DNS records so email leaves as the project rather than as us. Nothing
 * here blocks: the records resolve on their own schedule and can be added whenever the account
 * owner can reach their DNS, so Continue is a skip.
 *
 * Interim: this describes the records and points to where they are generated and verified
 * (Settings -> Integrations -> Channels). The in-step generator/verifier panel is a later stage.
 */
const RECORDS = [
  { kind: "TXT", label: "SPF", note: "Lets our servers send as your domain" },
  {
    kind: "TXT",
    label: "DKIM",
    note: "Signs each message so it is not forged",
  },
  { kind: "TXT", label: "DMARC", note: "Tells inboxes what to trust" },
  {
    kind: "CNAME",
    label: "Tracking",
    note: "Opens and clicks, on your domain",
  },
  { kind: "CNAME", label: "Return-Path", note: "Bounces come back to us" },
  { kind: "MX", label: "Mail", note: "Routes replies and bounces" },
];

export function StepDns({
  handingOver,
  website,
}: {
  handingOver: boolean;
  website: string;
}) {
  const domain = website
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "");
  return (
    <>
      <h1 className="text-foreground text-3xl font-bold">
        Set up your sending domain
      </h1>
      <p className="text-muted-foreground mt-3">
        {handingOver
          ? "Six DNS records so email leaves as you. If you can reach your DNS you can add them from Settings now; if not, skip, they go with the steps you send your developer."
          : "Six DNS records so email leaves as you rather than as us. You can generate and verify them from Settings whenever you can reach your DNS."}
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border border-border">
        <div className="bg-muted/40 text-muted-foreground border-b border-border px-4 py-2 text-xs font-medium">
          For {domain || "your domain"}
        </div>
        <ul className="divide-y divide-border">
          {RECORDS.map((r) => (
            <li key={r.label} className="flex items-center gap-3 px-4 py-3">
              <span className="text-muted-foreground w-14 shrink-0 font-mono text-xs">
                {r.kind}
              </span>
              <span className="text-foreground w-28 shrink-0 text-sm font-medium">
                {r.label}
              </span>
              <span className="text-muted-foreground text-sm">{r.note}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-muted-foreground mt-4 text-sm">
        Generate the exact values and verify them in Settings → Integrations →
        Channels. You do not have to wait here.
      </p>
    </>
  );
}
