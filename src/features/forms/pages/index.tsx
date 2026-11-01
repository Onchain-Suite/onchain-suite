"use client";

import {
  ClipboardDocumentListIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/ui/button";

import { FormStats } from "../components/form-stats";
import { FormsTable } from "../components/forms-table";
import { FormWizard } from "../components/wizard/form-wizard";
import type { CaptureForm } from "../forms.service";
import { useFormsList } from "../hooks/use-forms";
import { SectionEmpty } from "@/shared/components/common/section-empty";
import { PageHeader } from "@/shared/components/page/page-header";
import { TableSkeleton } from "@/shared/components/page/page-skeleton";

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
        <TableSkeleton rows={5} />
      ) : forms.length === 0 ? (
        <SectionEmpty
          icon={ClipboardDocumentListIcon}
          title="No forms yet"
          body="A form turns a visitor into a verified contact. It does not need any indexed data, so you can build one now."
          waits={false}
          action={{
            label: "New form",
            onClick: () => setCreateOpen(true),
            icon: PlusIcon,
          }}
        />
      ) : (
        <FormsTable forms={forms} onOpen={openForm} />
      )}

      {createOpen ? <FormWizard onClose={() => setCreateOpen(false)} /> : null}
    </div>
  );
}
