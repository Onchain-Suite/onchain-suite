"use client";

import {
  ArrowTopRightOnSquareIcon,
  BoltIcon,
  ChevronRightIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { memo, useEffect, useMemo, useState } from "react";

import { Button } from "@/ui/button";

import { cn } from "@/lib/utils";

import { type CaptureForm, readFormMeta } from "../forms.service";
import { useDeleteForm } from "../hooks/use-forms";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";

const PER_PAGE = 10;

/** Forms list table - matched to the Campaigns/Audience convention (plain
 *  overflow-x table, uppercase head, row dividers) with client-side pagination.
 *  Rows open the builder. */
export const FormsTable = memo(function FormsTable({
  forms,
  onOpen,
}: {
  forms: CaptureForm[];
  onOpen: (form: CaptureForm) => void;
}) {
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<CaptureForm | null>(null);
  const deleteForm = useDeleteForm(() => setPendingDelete(null));
  const totalPages = Math.max(1, Math.ceil(forms.length / PER_PAGE));

  // Snap back into range if the list shrinks under the current page.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const rows = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return forms.slice(start, start + PER_PAGE).map((form) => {
      const meta = readFormMeta(form.settings);
      return {
        form,
        type: meta.type === "identity" ? "Identity capture" : "Lead capture",
        surface: meta.surface === "hosted" ? "Hosted" : "Widget",
        enrolsInto: meta.afterSubmit.enrolAutomation
          ? meta.afterSubmit.automationName
          : null,
      };
    });
  }, [forms, page]);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
              <th className="py-3 pr-4 font-medium">Form</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Surface</th>
              <th className="px-4 py-3 text-right font-medium">Submissions</th>
              <th className="px-4 py-3 text-right font-medium">Conversion</th>
              <th className="px-4 py-3 font-medium">Enrols into</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="w-8 py-3" aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ form, type, surface, enrolsInto }) => {
              const live = form.status === "active";
              return (
                <tr
                  key={form.id}
                  onClick={() => onOpen(form)}
                  className="group cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/40"
                >
                  <td className="py-4 pr-4 font-medium text-foreground">
                    {form.name}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{type}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {surface}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right tabular-nums text-foreground">
                    {form.submissionCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right tabular-nums text-muted-foreground">
                    -
                  </td>
                  <td className="px-4 py-4">
                    {enrolsInto ? (
                      <span className="inline-flex items-center gap-1.5 text-foreground">
                        <BoltIcon
                          className="size-4 text-primary"
                          aria-hidden="true"
                        />
                        {enrolsInto}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
                        live
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          live ? "bg-emerald-500" : "bg-muted-foreground/60"
                        )}
                      />
                      {live ? "Live" : "Draft"}
                    </span>
                  </td>
                  <td className="py-4 pl-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {surface === "Hosted" && form.publicToken ? (
                        <a
                          href={`/f/${form.publicToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          title="Open hosted page"
                          aria-label={`Open hosted page for ${form.name}`}
                        >
                          <ArrowTopRightOnSquareIcon
                            className="size-4"
                            aria-hidden="true"
                          />
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDelete(form);
                        }}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Delete form"
                        aria-label={`Delete ${form.name}`}
                      >
                        <TrashIcon className="size-4" aria-hidden="true" />
                      </button>
                      <ChevronRightIcon
                        className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(page - 1) * PER_PAGE + 1}-
            {Math.min(page * PER_PAGE, forms.length)} of {forms.length}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteForm.isPending) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete form?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes{" "}
              <span className="font-medium text-foreground">
                {pendingDelete?.name}
              </span>{" "}
              and stops it collecting submissions. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteForm.isPending}>
              Keep form
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteForm.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) deleteForm.mutate(pendingDelete.id);
              }}
            >
              {deleteForm.isPending ? "Deleting…" : "Delete form"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
