"use client";

import { PlusSignIcon, TaskDaily01Icon } from "@hugeicons/core-free-icons";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/ui/button";

import { FormsTable } from "../components/forms-table";
import { FormWizard } from "../components/wizard/form-wizard";
import type { CaptureForm } from "../forms.service";
import { useFormsList } from "../hooks/use-forms";
import { formsAnswer } from "../utils/answer";
import { hugeicon } from "@/shared/components/common/hugeicon";
import { SectionEmpty } from "@/shared/components/common/section-empty";
import { PageHeader } from "@/shared/components/page/page-header";
import { TableSkeleton } from "@/shared/components/page/page-skeleton";

const NewGlyph = hugeicon(PlusSignIcon, "NewGlyph");
const FormGlyph = hugeicon(TaskDaily01Icon, "FormGlyph");

/**
 * Forms, in the 2.7 frame: the title, one sentence on what the live forms
 * brought in (it replaced four stat cards), New form on the right, then the
 * list. Opening a row routes to the full-screen builder.
 */
export function FormsPage() {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  // `?new=1` (the sidebar's Quick create) opens the wizard on arrival; the
  // param is dropped so a refresh or Back does not reopen it.
  const wantsNew = useSearchParams()?.get("new") === "1";
  useEffect(() => {
    if (!wantsNew) return;
    setCreateOpen(true);
    router.replace("/forms", { scroll: false });
  }, [wantsNew, router]);

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
        description={
          forms.length > 0 ? (
            <FormsAnswerLine forms={forms} />
          ) : (
            "Sign-up forms that turn visitors into contacts, with their consent."
          )
        }
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <NewGlyph className="mr-1.5 size-4" />
            New form
          </Button>
        }
      />

      {formsQuery.isLoading ? (
        <TableSkeleton rows={5} />
      ) : forms.length === 0 ? (
        <SectionEmpty
          icon={FormGlyph}
          title="No forms yet"
          body="A form turns a visitor into a verified contact. It does not need any indexed data, so you can build one now, then enrol every signup into a Loop."
          waits={false}
          action={{
            label: "New form",
            onClick: () => setCreateOpen(true),
            icon: NewGlyph,
          }}
          preview={{
            kind: "table",
            columns: [
              "Form",
              "Surface",
              "Submissions",
              "Conversion",
              "Enrols into",
            ],
          }}
        />
      ) : (
        <FormsTable forms={forms} onOpen={openForm} />
      )}

      {createOpen ? <FormWizard onClose={() => setCreateOpen(false)} /> : null}
    </div>
  );
}

function FormsAnswerLine({ forms }: { forms: CaptureForm[] }) {
  const a = formsAnswer(forms);
  if (a.live === 0)
    return "No form is live yet. Publish one to start turning visitors into contacts.";
  return (
    <>
      <b>
        {a.live} {a.live === 1 ? "form is" : "forms are"} live
      </b>{" "}
      and brought in{" "}
      <b>
        {a.signups.toLocaleString("en-US")}{" "}
        {a.signups === 1 ? "sign-up" : "sign-ups"}
      </b>
      {a.top ? <>, most of them through &ldquo;{a.top}&rdquo;</> : null}.
    </>
  );
}
