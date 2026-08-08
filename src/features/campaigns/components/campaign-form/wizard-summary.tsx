/**
 * Persistent right-column summary for the campaign wizard. Values are derived
 * by the parent from the form so it stays in sync across steps. Leads with the
 * live recipient estimate (matching the reference), then the send config.
 */
export function WizardSummary({
  estimatedRecipients,
  estimateLabel = "Estimated recipients",
  channel = "",
  sender = "",
  template = "",
  delivery = "",
  smartSending = false,
  rows: rowsOverride,
}: {
  estimatedRecipients?: number | null;
  estimateLabel?: string;
  channel?: string;
  sender?: string;
  template?: string;
  delivery?: string;
  smartSending?: boolean;
  /** Fully overrides the config rows (e.g. in-app push shows different ones). */
  rows?: { label: string; value: string }[];
}) {
  const rows: { label: string; value: string }[] = rowsOverride ?? [
    { label: "Channel", value: channel },
    { label: "Sender", value: sender },
    { label: "Template", value: template },
    { label: "Delivery", value: delivery },
    { label: "Smart sending", value: smartSending ? "On" : "Off" },
  ];

  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="text-3xl font-semibold tracking-tight text-foreground">
          {typeof estimatedRecipients === "number"
            ? estimatedRecipients.toLocaleString()
            : "-"}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {estimateLabel}
        </div>

        <dl className="mt-4 space-y-3 border-t border-border/60 pt-4 text-sm">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-3"
            >
              <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
              <dd className="min-w-0 truncate text-right font-medium text-foreground">
                {row.value || "-"}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="mt-3 px-1 text-xs leading-relaxed text-muted-foreground">
        Draft autosaves as you go. Nothing sends until you confirm on the review
        step.
      </p>
    </aside>
  );
}
