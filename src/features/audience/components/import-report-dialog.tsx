"use client";

import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";

import type { AudienceImportReportBucket } from "../audience.service";
import { audienceService } from "../audience.service";

const TONE_DOT: Record<AudienceImportReportBucket["tone"], string> = {
  positive: "bg-emerald-500",
  neutral: "bg-muted-foreground",
  warning: "bg-amber-500",
  negative: "bg-destructive",
};

/**
 * The per-import report: a breakdown of what happened to every address in a past
 * import (imported, already-in-org, suppressed, invalid, filtered, held), plus a
 * PDF download. Reads `GET /audience/imports/:jobId/report`; the PDF is streamed
 * from `.../report.pdf`. Opens when `jobId` is set.
 */
export function ImportReportDialog({
  jobId,
  fileName,
  onClose,
}: {
  jobId: string | null;
  fileName?: string;
  onClose: () => void;
}) {
  const open = jobId !== null;

  const reportQuery = useQuery({
    queryKey: ["audience", "import-report", jobId],
    enabled: open,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () => audienceService.getImportReport(jobId as string),
  });

  const pdfMutation = useMutation({
    mutationFn: () => audienceService.downloadImportReportPdf(jobId as string),
    onSuccess: (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `import-report-${jobId ?? "job"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error ? e.message : "Couldn't download the report."
      ),
  });

  const report = reportQuery.data;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import report</DialogTitle>
          <DialogDescription>
            {fileName ? `${fileName} — ` : ""}what happened to every address in
            this import.
          </DialogDescription>
        </DialogHeader>

        {reportQuery.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Loading report…
          </p>
        ) : reportQuery.isError || !report ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            We couldn&apos;t load this report.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                {report.imported.toLocaleString()}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  contacts imported
                </span>
              </p>
              {report.totalRows !== null ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {report.totalRows.toLocaleString()} rows in file
                </p>
              ) : null}
            </div>

            <ul className="divide-y divide-border rounded-xl border border-border">
              {report.buckets.map((b) => (
                <li
                  key={b.key}
                  className="flex items-start justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span
                        className={`size-1.5 rounded-full ${TONE_DOT[b.tone]}`}
                      />
                      {b.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {b.description}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {b.count.toLocaleString()}
                    {b.approximate ? "+" : ""}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                disabled={pdfMutation.isPending}
                onClick={() => pdfMutation.mutate()}
              >
                <ArrowDownTrayIcon
                  className="mr-1.5 size-4"
                  aria-hidden="true"
                />
                {pdfMutation.isPending ? "Preparing…" : "Download PDF"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
