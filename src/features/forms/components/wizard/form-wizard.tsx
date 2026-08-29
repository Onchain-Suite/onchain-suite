"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";

import { cn } from "@/lib/utils";

import { FORMS_FARCASTER_ENABLED } from "../../config";
import {
  defaultFieldsForTemplate,
  FORM_STYLES,
  FORM_TEMPLATES,
  type FormStyleId,
  type FormTemplateDef,
  surfaceForStyle,
} from "../../forms.catalog";
import {
  type CaptureFieldSpec,
  type CaptureFieldType,
  DEFAULT_TIMING,
  formsService,
  readFormMeta,
  writeFormMeta,
} from "../../forms.service";
import { useCreateForm } from "../../hooks/use-forms";
import { FormSummary } from "./form-summary";
import { StyleThumb, TemplateThumb } from "./style-thumb";

type Step = "style" | "template" | "content";

const STEP_META: { id: Step; title: string; sub: string }[] = [
  { id: "style", title: "Style", sub: "How it appears" },
  { id: "template", title: "Template", sub: "Starting layout" },
  { id: "content", title: "Content", sub: "Fields & settings" },
];

const CONSENT_LABEL =
  "I agree to receive updates and consent to linking my wallet to my contact details. I can unsubscribe any time.";

/** Fields a brand-new form starts with before a template is picked. */
function defaultNewFields(): CaptureFieldSpec[] {
  const types: CaptureFieldType[] = [
    "wallet",
    "email",
    "x",
    ...(FORMS_FARCASTER_ENABLED ? (["farcaster"] as CaptureFieldType[]) : []),
    "consent",
  ];
  const label: Record<string, string> = {
    wallet: "Wallet",
    email: "Email address",
    x: "X (Twitter)",
    farcaster: "Farcaster",
    consent: CONSENT_LABEL,
  };
  return types.map((type) => ({
    key: type,
    type,
    label: label[type],
    required: type !== "x" && type !== "farcaster",
  }));
}

/**
 * Full-screen create wizard: Style -> Template -> Content. Style and template
 * are picked here; on "Save & next" from Template the form is created (with
 * style/template/type persisted in `settings.meta`) and the user lands in the
 * builder, which is the Content step.
 */
export function FormWizard({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("style");
  const [name, setName] = useState("Untitled form");
  const [style, setStyle] = useState<FormStyleId>("inline");
  const [template, setTemplate] = useState<FormTemplateDef | null>(null);
  const [fields, setFields] = useState<CaptureFieldSpec[]>(defaultNewFields);

  const formName = name.trim() || "Untitled form";

  const type = template?.type ?? "identity";
  const surface = surfaceForStyle(style);

  const create = useCreateForm((form) => {
    // New forms start as DRAFT (like automations and campaigns) - live only on
    // explicit publish. POST /forms has no status field, so set it right after
    // create via PATCH; a failure here can't block creation.
    const openBuilder = () => router.push(`/forms/${form.id}`);
    formsService
      .updateForm(form.id, { status: "draft" })
      .then(openBuilder, openBuilder);
  });

  const selectStyle = (id: FormStyleId) => setStyle(id);
  const selectTemplate = (tpl: FormTemplateDef) => {
    setTemplate(tpl);
    setFields(defaultFieldsForTemplate(tpl));
  };

  const submit = () => {
    const meta = {
      ...readFormMeta(undefined),
      style,
      template: template?.id ?? null,
      type,
      surface,
      timing: { ...DEFAULT_TIMING },
    };
    create.mutate({
      name: formName,
      fields,
      zkEnabled: type === "identity",
      settings: writeFormMeta(undefined, meta),
    });
  };

  const stepIndex = STEP_META.findIndex((s) => s.id === step);
  const canReachContent = template !== null;

  const goTo = (target: Step) => {
    if (target === "content") {
      if (canReachContent) submit();
      return;
    }
    setStep(target);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
            Forms
          </button>
          <span className="text-border">|</span>
          <span className="truncate text-sm font-semibold text-foreground">
            {formName}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-muted-foreground" />
            Draft
          </span>
        </div>

        <div className="flex items-center gap-2">
          {step === "template" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep("style")}
            >
              Back
            </Button>
          ) : null}
          {step === "style" ? (
            <Button size="sm" onClick={() => setStep("template")}>
              Save &amp; next
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={!canReachContent || create.isPending}
              onClick={submit}
            >
              {create.isPending ? "Creating…" : "Save & next"}
              {!create.isPending ? (
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              ) : null}
            </Button>
          )}
        </div>
      </header>

      {/* Body: rail | cards | summary */}
      <div className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 gap-8 px-6 py-12 lg:grid-cols-[170px_1fr_300px]">
        <StepRail
          step={step}
          stepIndex={stepIndex}
          canReachContent={canReachContent}
          onGo={goTo}
        />

        <div>
          {step === "style" ? (
            <>
              <h2 className="mb-5 text-2xl font-bold text-foreground">
                Select a style
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {FORM_STYLES.map((s) => (
                  <PickCard
                    key={s.id}
                    selected={style === s.id}
                    name={s.name}
                    desc={s.desc}
                    thumb={<StyleThumb style={s.id} />}
                    onClick={() => selectStyle(s.id)}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="mb-5 text-2xl font-bold text-foreground">
                Select a template
              </h2>
              <div className="mb-6 max-w-sm space-y-1.5">
                <Label htmlFor="wizard-form-name">Form name</Label>
                <Input
                  id="wizard-form-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Untitled form"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {FORM_TEMPLATES.map((t) => (
                  <PickCard
                    key={t.id}
                    selected={template?.id === t.id}
                    name={t.name}
                    desc={t.desc}
                    thumb={<TemplateThumb type={t.type} />}
                    onClick={() => selectTemplate(t)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <FormSummary
          name={formName}
          style={style}
          template={template?.id ?? null}
          type={type}
          fields={fields}
        />
      </div>
    </div>
  );
}

function StepRail({
  step,
  stepIndex,
  canReachContent,
  onGo,
}: {
  step: Step;
  stepIndex: number;
  canReachContent: boolean;
  onGo: (s: Step) => void;
}) {
  return (
    <nav className="flex flex-col gap-5" aria-label="Create form steps">
      {STEP_META.map((s, i) => {
        const done = i < stepIndex;
        const active = s.id === step;
        const reachable =
          i <= stepIndex || (s.id === "content" && canReachContent);
        return (
          <button
            key={s.id}
            type="button"
            disabled={!reachable}
            onClick={() => onGo(s.id)}
            className={cn(
              "flex items-center gap-3 text-left transition-opacity",
              reachable ? "cursor-pointer" : "cursor-not-allowed opacity-40"
            )}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                active
                  ? "bg-primary text-primary-foreground"
                  : done
                    ? "bg-primary/15 text-primary"
                    : "border border-border text-muted-foreground"
              )}
            >
              {done ? (
                <CheckIcon className="size-3.5" aria-hidden="true" />
              ) : (
                i + 1
              )}
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-sm font-semibold",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.title}
              </span>
              <span className="block text-xs text-muted-foreground">
                {s.sub}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function PickCard({
  selected,
  name,
  desc,
  thumb,
  onClick,
}: {
  selected: boolean;
  name: string;
  desc: string;
  thumb: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-colors",
        selected
          ? "border-primary ring-1 ring-primary"
          : "border-border hover:border-primary/40"
      )}
    >
      <span className="flex aspect-[3/2] items-center justify-center bg-muted/40 p-4">
        {thumb}
      </span>
      <span className="border-t border-border px-3 py-2.5">
        <span className="block text-sm font-semibold text-foreground">
          {name}
        </span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </button>
  );
}
