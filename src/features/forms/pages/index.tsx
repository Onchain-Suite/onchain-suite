"use client";

import { DocumentTextIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Skeleton } from "@/ui/skeleton";

import { FormStats } from "../components/form-stats";
import { FormsTable } from "../components/forms-table";
import { FormWizard } from "../components/wizard/form-wizard";
import type { CaptureForm } from "../forms.service";
import { useFormsList } from "../hooks/use-forms";
import { PageHeader } from "@/shared/components/page/page-header";

/**
 * Email-to-Wallet capture forms. Header + stats over a single table of forms;
 * opening a row routes to the full-screen builder.
 */
export function FormsPage() {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  const formsQuery = useFormsList();
  const forms = useMemo(() => formsQuery.data ?? [], [formsQuery.data]);

  const openForm = useCallback(
    (form: CaptureForm) => router.push(`/forms/${form.id}`),
    [router]
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Forms"
        description="Capture forms that turn visitors into ZK-verified contacts and enrol them into automations."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="mr-1 h-4 w-4" aria-hidden="true" />
            New form
          </Button>
        }
      />

      <FormStats forms={forms} />

      {formsQuery.isLoading ? (
        <TableSkeleton />
      ) : forms.length === 0 ? (
        <EmptyState onCreate={() => setCreateOpen(true)} />
      ) : (
        <FormsTable forms={forms} onOpen={openForm} />
      )}

      {createOpen ? <FormWizard onClose={() => setCreateOpen(false)} /> : null}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2 rounded-xl border border-border/60 p-4">
      {["a", "b", "c", "d"].map((k) => (
        <Skeleton key={k} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="rounded-full border border-border bg-muted/40 p-3">
          <DocumentTextIcon
            className="h-6 w-6 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <p className="text-sm font-medium text-foreground">No forms yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Create one to get an embeddable widget or a hosted page and start
          capturing wallets.
        </p>
        <Button onClick={onCreate} size="sm">
          <PlusIcon className="mr-1 h-4 w-4" aria-hidden="true" />
          Create your first form
        </Button>
      </CardContent>
    </Card>
  );
}
