"use client";

import { BoltIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { memo, useMemo } from "react";

import { cn } from "@/lib/utils";

import { type CaptureForm, readFormMeta } from "../forms.service";

/** The forms list table - mirrors the reference: type, surface, submissions,
 *  conversion, the automation it enrols into, and status. Rows open the builder. */
export const FormsTable = memo(function FormsTable({
  forms,
  onOpen,
}: {
  forms: CaptureForm[];
  onOpen: (form: CaptureForm) => void;
}) {
  const rows = useMemo(
    () =>
      forms.map((form) => {
        const meta = readFormMeta(form.settings);
        return {
          form,
          type: meta.type === "identity" ? "Identity capture" : "Lead capture",
          surface: meta.surface === "hosted" ? "Hosted" : "Widget",
          enrolsInto: meta.afterSubmit.enrolAutomation
            ? meta.afterSubmit.automationName
            : null,
        };
      }),
    [forms]
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <th className="px-5 py-3 font-medium">Form</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Surface</th>
            <th className="px-4 py-3 text-right font-medium">Submissions</th>
            <th className="px-4 py-3 font-medium">Conversion</th>
            <th className="px-4 py-3 font-medium">Enrols into</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="w-10 px-4 py-3" aria-label="Open" />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ form, type, surface, enrolsInto }) => {
            const live = form.status === "active";
            return (
              <tr
                key={form.id}
                onClick={() => onOpen(form)}
                className="group cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-muted/40"
              >
                <td className="px-5 py-3.5 font-medium text-foreground">
                  {form.name}
                </td>
                <td className="px-4 py-3.5 text-muted-foreground">{type}</td>
                <td className="px-4 py-3.5">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {surface}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums text-foreground">
                  {form.submissionCount.toLocaleString()}
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-muted-foreground">—</span>
                </td>
                <td className="px-4 py-3.5">
                  {enrolsInto ? (
                    <span className="inline-flex items-center gap-1.5 text-foreground">
                      <BoltIcon
                        className="size-4 text-primary"
                        aria-hidden="true"
                      />
                      {enrolsInto}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                      live
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        live ? "bg-emerald-500" : "bg-muted-foreground"
                      )}
                    />
                    {live ? "Live" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <ChevronRightIcon
                    className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
