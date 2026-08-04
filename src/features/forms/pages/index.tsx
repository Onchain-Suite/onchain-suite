"use client";

import { DocumentTextIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Skeleton } from "@/ui/skeleton";

import { CreateFormDialog } from "../components/create-form-dialog";
import { FormCard } from "../components/form-card";
import { FormStats } from "../components/form-stats";
import { FormsTable } from "../components/forms-table";
import {
  type FormsStatusFilter,
  FormsToolbar,
  type FormsViewMode,
} from "../components/forms-toolbar";
import type { CaptureForm } from "../forms.service";
import { useCreateForm, useFormsList } from "../hooks/use-forms";
import { PageHeader } from "@/shared/components/page/page-header";

/**
 * Email-to-Wallet capture forms.
 * Header + stats + toolbar over a grid/table of forms; opening a form routes to
 * the full-page builder (Build / Submissions / Share).
 */
export function FormsPage() {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FormsStatusFilter>("all");
  const [viewMode, setViewMode] = useState<FormsViewMode>("grid");

  const formsQuery = useFormsList();
  const forms = useMemo(() => formsQuery.data ?? [], [formsQuery.data]);

  const filteredForms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return forms.filter((f) => {
      if (status !== "all" && f.status !== status) return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        (f.tag ?? "").toLowerCase().includes(q)
      );
    });
  }, [forms, search, status]);

  const createMutation = useCreateForm((form) => {
    setCreateOpen(false);
    router.push(`/forms/${form.id}`);
  });

  const openForm = useCallback(
    (form: CaptureForm) => router.push(`/forms/${form.id}`),
    [router]
  );

  const isFiltering = search.trim().length > 0 || status !== "all";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="Forms"
        description="Capture emails via embeddable forms — connect to the API to encrypt captures (ZK) and never expose addresses."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="mr-1 h-4 w-4" aria-hidden="true" />
            New form
          </Button>
        }
      />

      <FormStats forms={forms} />

      <FormsToolbar
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {formsQuery.isLoading ? (
        <FormsSkeleton viewMode={viewMode} />
      ) : filteredForms.length === 0 ? (
        <EmptyState
          filtering={isFiltering}
          onCreate={() => setCreateOpen(true)}
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredForms.map((form) => (
            <FormCard key={form.id} form={form} onOpen={openForm} />
          ))}
        </div>
      ) : (
        <FormsTable forms={filteredForms} onOpen={openForm} />
      )}

      <CreateFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        submitting={createMutation.isPending}
        onCreate={(input) => createMutation.mutate(input)}
      />
    </div>
  );
}

function FormsSkeleton({ viewMode }: { viewMode: FormsViewMode }) {
  if (viewMode === "list") {
    return (
      <div className="space-y-2">
        {["a", "b", "c", "d"].map((k) => (
          <Skeleton key={k} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {["a", "b", "c"].map((k) => (
        <Skeleton key={k} className="h-64 w-full rounded-xl" />
      ))}
    </div>
  );
}

function EmptyState({
  filtering,
  onCreate,
}: {
  filtering: boolean;
  onCreate: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="rounded-full border border-border bg-muted/40 p-3">
          <DocumentTextIcon
            className="h-6 w-6 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        {filtering ? (
          <>
            <p className="text-sm font-medium text-foreground">
              No forms match your filters
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Try a different search or status filter.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-foreground">No forms yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create one to get an embeddable snippet you can drop on any site
              and start capturing wallets.
            </p>
            <Button onClick={onCreate} size="sm">
              <PlusIcon className="mr-1 h-4 w-4" aria-hidden="true" />
              Create your first form
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
