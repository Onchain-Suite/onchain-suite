"use client";

import { useMemo } from "react";

import type { CaptureForm } from "../forms.service";

/** Aggregate stats derived from the forms list - no extra fetches. */
export function FormStats({ forms }: { forms: CaptureForm[] }) {
  const stats = useMemo(() => {
    const submissions = forms.reduce((s, f) => s + f.submissionCount, 0);
    const live = forms.filter((f) => f.status === "active").length;
    // "ZK-verified links": captures on ZK-enabled forms (verified wallet↔email).
    const zkLinks = forms.reduce(
      (s, f) => s + (f.zkEnabled ? f.submissionCount : 0),
      0
    );
    // Avg conversion needs a views metric the API doesn't return yet -> "—".
    return { submissions, live, zkLinks };
  }, [forms]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatBox
        label="Total submissions"
        value={stats.submissions.toLocaleString()}
      />
      <StatBox label="Avg conversion" value="—" muted />
      <StatBox
        label="ZK-verified links"
        value={stats.zkLinks.toLocaleString()}
      />
      <StatBox label="Live forms" value={String(stats.live)} />
    </div>
  );
}

function StatBox({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={
          muted
            ? "mt-1 text-2xl font-semibold text-muted-foreground"
            : "mt-1 text-2xl font-semibold text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}
