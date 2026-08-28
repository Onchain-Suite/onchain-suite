"use client";

import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowUpTrayIcon,
  AtSymbolIcon,
  Bars3BottomLeftIcon,
  CheckIcon,
  EnvelopeIcon,
  InformationCircleIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  SignalIcon,
  WalletIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";

import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { Switch } from "@/ui/switch";
import { Textarea } from "@/ui/textarea";

import { cn, isJsonObject } from "@/lib/utils";

import { FORMS_FARCASTER_ENABLED } from "../config";
import {
  ACCENT_SWATCHES,
  BG_OPTIONS,
  BUTTON_OPTIONS,
  COMPLETION_OPTIONS,
  CORNER_OPTIONS,
  FIELD_CATALOG,
  FORM_STYLES,
  type FormCaptureType,
  type FormStyleId,
  type FormSurface,
  submitLabelForType,
  surfaceForStyle,
  timingApplies,
} from "../forms.catalog";
import {
  type CaptureFieldSpec,
  type CaptureFieldType,
  type FormAppearance,
  type FormCompletion,
  type FormDisplaySettings,
  type FormMeta,
  type FormTiming,
  type FormTrigger,
  readDisplaySettings,
  readFormMeta,
  writeDisplaySettings,
  writeFormMeta,
} from "../forms.service";
import { useForm, useUpdateForm } from "../hooks/use-forms";
import { EmbedSnippet } from "./embed-snippet";
import { FormPreviewStage } from "./form-preview-stage";
import { SubmissionsTab } from "./submissions-tab";
import { audienceService } from "@/features/audience/audience.service";
import { automationService } from "@/features/automation/automation.service";
import { SendConfirmDialog } from "@/shared/components/common/send-confirm-dialog";

type Tab = "build" | "submissions" | "share";
type BuildTab = "fields" | "display" | "settings";

/** Palette of addable fields. Wallet + social are identity-only. */
const FIELD_PALETTE: {
  type: CaptureFieldType;
  label: string;
  icon: typeof EnvelopeIcon;
  defaultLabel: string;
  identityOnly?: boolean;
}[] = [
  {
    type: "email",
    label: "Email",
    icon: EnvelopeIcon,
    defaultLabel: "Email address",
  },
  {
    type: "text",
    label: "Short text",
    icon: Bars3BottomLeftIcon,
    defaultLabel: "Your answer",
  },
  {
    type: "x",
    label: "Link X",
    icon: AtSymbolIcon,
    defaultLabel: "X (Twitter)",
    identityOnly: true,
  },
  {
    type: "farcaster",
    label: "Link Farcaster",
    icon: SignalIcon,
    defaultLabel: "Farcaster",
    identityOnly: true,
  },
  {
    type: "wallet",
    label: "Connect wallet",
    icon: WalletIcon,
    defaultLabel: "Wallet",
    identityOnly: true,
  },
];

const PAGE_OPTIONS = [
  "All pages",
  "Homepage only",
  "Specific paths…",
  "Everywhere except checkout",
];
const FREQ_OPTIONS = [
  "Once per visitor",
  "Once per session",
  "Every visit",
  "Until submitted",
];
const TRIGGER_OPTIONS: { value: FormTrigger; label: string }[] = [
  { value: "load", label: "On page load" },
  { value: "delay", label: "After a delay" },
  { value: "scroll", label: "On scroll depth" },
  { value: "exit", label: "On exit intent" },
];

const uniqueKey = (base: string, taken: Set<string>) => {
  let key = base;
  let n = 1;
  while (taken.has(key)) key = `${base}_${n++}`;
  return key;
};

type Named = { id: string; name: string };
const normalizeNamed = (raw: unknown): Named[] => {
  const arr = Array.isArray(raw)
    ? raw
    : isJsonObject(raw) && Array.isArray(raw.items)
      ? raw.items
      : isJsonObject(raw) && Array.isArray(raw.data)
        ? raw.data
        : [];
  return arr
    .map((e): Named | null => {
      if (!isJsonObject(e)) return null;
      const id = typeof e.id === "string" ? e.id : null;
      const name =
        typeof e.name === "string"
          ? e.name
          : typeof e.title === "string"
            ? e.title
            : null;
      return id && name ? { id, name } : null;
    })
    .filter((x): x is Named => x !== null);
};

export function FormBuilder({ id }: { id: string }) {
  const { data: form, isLoading, isError } = useForm(id);
  const saveMutation = useUpdateForm(undefined, { successToast: "Saved" });
  const statusMutation = useUpdateForm(undefined, { successToast: null });

  const [tab, setTab] = useState<Tab>("build");
  const [buildTab, setBuildTab] = useState<BuildTab>("fields");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  // Guard shown before a form goes live and starts collecting contacts.
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  // Staged edits, seeded from the loaded form.
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [status, setStatus] = useState("active");
  const [origins, setOrigins] = useState("");
  const [listId, setListId] = useState<string>("");
  const [fields, setFields] = useState<CaptureFieldSpec[]>([]);
  const [display, setDisplay] = useState<Required<FormDisplaySettings>>(
    readDisplaySettings(undefined)
  );
  const [meta, setMeta] = useState<FormMeta>(readFormMeta(undefined));

  useEffect(() => {
    if (!form) return;
    setName(form.name);
    setTag(form.tag ?? "");
    setStatus(form.status);
    setOrigins(form.allowedOrigins.join(", "));
    setListId(form.listId ?? "");
    setFields(form.fields.length > 0 ? form.fields : []);
    setDisplay(readDisplaySettings(form.settings));
    setMeta(readFormMeta(form.settings));
  }, [form]);

  // Lists + automations for the Settings dropdowns.
  const listsQuery = useQuery({
    queryKey: ["forms", "lists"],
    queryFn: () => audienceService.listSegments({ limit: 100 }),
    staleTime: 60_000,
    retry: false,
  });
  const lists = useMemo(
    () => (listsQuery.data ?? []).map((s) => ({ id: s.id, name: s.name })),
    [listsQuery.data]
  );
  const automationsQuery = useQuery({
    queryKey: ["forms", "automations"],
    queryFn: () => automationService.listAutomations({ limit: 100 }),
    staleTime: 60_000,
    retry: false,
    enabled: meta.afterSubmit.enrolAutomation,
  });
  const automations = useMemo(
    () => normalizeNamed(automationsQuery.data),
    [automationsQuery.data]
  );

  const zk = meta.type === "identity";

  const buildInput = () => ({
    name: name.trim() || "Untitled form",
    tag: tag.trim() || null,
    status,
    zkEnabled: zk,
    listId: listId || null,
    fields: fields.filter((f) => f.key.trim().length > 0),
    allowedOrigins: origins
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
    settings: writeFormMeta(
      writeDisplaySettings(form?.settings, display),
      meta
    ),
  });

  const save = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    saveMutation.mutate({ id, input: buildInput() });
  };

  // Persist the form name the moment the user finishes renaming (blur/Enter),
  // like the campaign editor - so the title sticks without waiting for Save,
  // whatever the form's status (draft, live, paused).
  const persistName = () => {
    const next = name.trim() || "Untitled form";
    if (!form || next === form.name) return;
    statusMutation.mutate({ id, input: { name: next } });
  };

  const setLive = (next: "active" | "paused") => {
    setStatus(next);
    statusMutation.mutate(
      { id, input: { ...buildInput(), status: next } },
      {
        onSuccess: () => {
          toast.success(next === "active" ? "Form is live" : "Form paused");
          setShowPublishConfirm(false);
        },
        onError: () => setShowPublishConfirm(false),
      }
    );
  };

  const toggleLive = () => {
    // Pausing is safe and instant; publishing (going live) asks first.
    if (status === "active") {
      setLive("paused");
      return;
    }
    setShowPublishConfirm(true);
  };

  const has = (type: CaptureFieldType) =>
    fields.some((f) => (f.type ?? "text") === type);

  const addField = (type: CaptureFieldType, defaultLabel: string) => {
    if (meta.type === "lead" && type !== "email" && type !== "text") return;
    if ((type === "wallet" || type === "consent") && has(type)) return;
    const taken = new Set(fields.map((f) => f.key));
    const key = uniqueKey(type, taken);
    setFields([
      ...fields,
      {
        key,
        label: defaultLabel,
        type,
        required: type === "wallet" || type === "consent" || type === "email",
      },
    ]);
    setSelectedKey(key);
  };

  const patchField = (key: string, patch: Partial<CaptureFieldSpec>) =>
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, ...patch } : f))
    );
  const removeField = (key: string) => {
    setFields((prev) => prev.filter((f) => f.key !== key));
    setSelectedKey((cur) => (cur === key ? null : cur));
  };
  const moveField = (key: string, dir: -1 | 1) =>
    setFields((prev) => {
      const i = prev.findIndex((f) => f.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const selectField = (key: string) => {
    setSelectedKey(key);
    setBuildTab("fields");
  };

  const publicUrl = useMemo(() => {
    if (!form) return "";
    if (typeof window === "undefined") return `/f/${form.publicToken}`;
    return `${window.location.origin}/f/${form.publicToken}`;
  }, [form]);

  if (isLoading) {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading form…
        </div>
      </Shell>
    );
  }
  if (isError || !form) {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load this form.
          </p>
          <Button asChild variant="outline">
            <Link href="/forms">Back to forms</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const live = status === "active";
  const selectedField = fields.find((f) => f.key === selectedKey) ?? null;

  const publishDestination =
    lists.find((l) => l.id === listId)?.name ?? "Default audience";
  const publishFieldCount = fields.filter(
    (f) => f.key.trim().length > 0
  ).length;

  return (
    <Shell>
      <SendConfirmDialog
        open={showPublishConfirm}
        onOpenChange={setShowPublishConfirm}
        title="Publish this form?"
        description="Once live, anyone with the link or embed can submit and become a contact."
        details={[
          { label: "Form", value: name.trim() || "Untitled form" },
          {
            label: "Fields",
            value: `${publishFieldCount} ${
              publishFieldCount === 1 ? "field" : "fields"
            }`,
          },
          { label: "Contacts land in", value: publishDestination },
        ]}
        confirmLabel="Publish"
        confirmingLabel="Publishing…"
        confirming={statusMutation.isPending}
        onConfirm={() => setLive("active")}
      />
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/forms"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
            Forms
          </Link>
          <span className="text-border">|</span>
          {renaming ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                persistName();
                setRenaming(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  persistName();
                  setRenaming(false);
                } else if (e.key === "Escape") {
                  setName(form.name);
                  setRenaming(false);
                }
              }}
              aria-label="Form name"
              placeholder="Untitled form"
              className="min-w-0 max-w-[240px] rounded border border-border bg-background px-1.5 py-0.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          ) : (
            <button
              type="button"
              onClick={() => setRenaming(true)}
              title="Rename form"
              className="group flex min-w-0 items-center gap-1.5 text-sm font-semibold text-foreground"
            >
              <span className="truncate">{name || "Untitled form"}</span>
              <PencilIcon
                className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden="true"
              />
            </button>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
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
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          {(["build", "submissions", "share"] as const).map((tt) => (
            <button
              key={tt}
              type="button"
              onClick={() => setTab(tt)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors",
                tab === tt
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tt}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLive}
            disabled={statusMutation.isPending}
          >
            {live ? (
              <>
                <PauseIcon className="size-4" aria-hidden="true" />
                Pause
              </>
            ) : (
              <>
                <PlayIcon className="size-4" aria-hidden="true" />
                Publish
              </>
            )}
          </Button>
          <Button size="sm" onClick={save} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {tab === "build" ? (
          <>
            {/* Left config panel */}
            <aside className="flex w-80 shrink-0 flex-col border-r border-border">
              <div className="flex gap-4 border-b border-border px-4">
                {(["fields", "display", "settings"] as const).map((tt) => (
                  <button
                    key={tt}
                    type="button"
                    onClick={() => setBuildTab(tt)}
                    className={cn(
                      "-mb-px border-b-2 py-3 text-sm font-medium capitalize transition-colors",
                      buildTab === tt
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tt}
                  </button>
                ))}
              </div>

              <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto p-4">
                {buildTab === "fields" ? (
                  <FieldsPanel
                    captureType={meta.type}
                    fields={fields}
                    selectedField={selectedField}
                    onAdd={addField}
                    onPatch={patchField}
                    onRemove={removeField}
                  />
                ) : null}

                {buildTab === "display" ? (
                  <TimingPanel
                    meta={meta}
                    onTiming={(timing) => setMeta((m) => ({ ...m, timing }))}
                  />
                ) : null}

                {buildTab === "settings" ? (
                  <SettingsPanel
                    name={name}
                    tag={tag}
                    origins={origins}
                    listId={listId}
                    lists={lists}
                    automations={automations}
                    display={display}
                    meta={meta}
                    fields={fields}
                    onName={setName}
                    onTag={setTag}
                    onOrigins={setOrigins}
                    onListId={setListId}
                    onDisplay={setDisplay}
                    onMeta={setMeta}
                  />
                ) : null}
              </div>
            </aside>

            {/* Preview canvas */}
            <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto bg-muted/30 p-6">
              <FormPreviewStage
                name={name}
                fields={fields}
                display={display}
                appearance={meta.appearance}
                submitLabel={submitLabelForType(meta.type)}
                zkEnabled={zk}
                style={meta.style}
                surface={meta.surface}
                device={device}
                onDevice={setDevice}
                onEditStyle={() => setBuildTab("settings")}
                editing={{
                  selectedKey,
                  onSelect: selectField,
                  onMove: moveField,
                  onRemove: removeField,
                }}
                hostedUrl={publicUrl.replace(/^https?:\/\//, "")}
              />
              <p className="mx-auto mt-4 max-w-md text-center text-xs text-muted-foreground">
                {meta.surface === "hosted" ? (
                  <>
                    Live preview of the hosted page at{" "}
                    <span className="font-mono">/f/{form.publicToken}</span>
                  </>
                ) : (
                  <>
                    Live preview of the{" "}
                    {FORM_STYLES.find(
                      (s) => s.id === meta.style
                    )?.name.toLowerCase()}{" "}
                    widget
                  </>
                )}
              </p>
            </div>
          </>
        ) : tab === "submissions" ? (
          <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-5xl">
              <SubmissionsTab
                formId={id}
                csvUrl={`/api/v1/forms/${id}/submissions/export.csv`}
              />
            </div>
          </div>
        ) : (
          <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-2xl">
              <ShareTab
                surface={meta.surface}
                publicUrl={publicUrl}
                embedCode={form.embedCode}
                submitUrl={form.submitUrl}
              />
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

/** Full-viewport overlay so the builder breaks out of the dashboard shell,
 *  matching the email campaign editor. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- Fields tab

function FieldsPanel({
  captureType,
  fields,
  selectedField,
  onAdd,
  onPatch,
  onRemove,
}: {
  captureType: FormCaptureType;
  fields: CaptureFieldSpec[];
  selectedField: CaptureFieldSpec | null;
  onAdd: (type: CaptureFieldType, defaultLabel: string) => void;
  onPatch: (key: string, patch: Partial<CaptureFieldSpec>) => void;
  onRemove: (key: string) => void;
}) {
  const isLead = captureType === "lead";
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Add a field
        </p>
        <div className="grid grid-cols-2 gap-2">
          {FIELD_PALETTE.filter(
            (f) => f.type !== "farcaster" || FORMS_FARCASTER_ENABLED
          ).map((item) => {
            const gated = Boolean(item.identityOnly) && isLead;
            const dupe =
              item.type === "wallet" && fields.some((f) => f.type === "wallet");
            const disabled = gated || dupe;
            return (
              <button
                key={item.type}
                type="button"
                disabled={disabled}
                onClick={() => onAdd(item.type, item.defaultLabel)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm text-foreground transition-colors",
                  disabled
                    ? "cursor-not-allowed opacity-40"
                    : "hover:border-primary/40 hover:bg-muted/40"
                )}
              >
                <item.icon
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                {item.label}
              </button>
            );
          })}
        </div>
        {isLead ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Wallet &amp; social fields are available on Identity capture forms.
            Switch type under Settings.
          </p>
        ) : null}
      </div>

      {selectedField ? (
        <FieldInspector
          field={selectedField}
          onPatch={onPatch}
          onRemove={onRemove}
        />
      ) : (
        <p className="rounded-lg border border-dashed border-border p-3 text-xs leading-relaxed text-muted-foreground">
          Select a field in the preview to edit its label, mark it required, or
          remove it. Reorder with the ↑↓ controls.
        </p>
      )}
    </div>
  );
}

function FieldInspector({
  field,
  onPatch,
  onRemove,
}: {
  field: CaptureFieldSpec;
  onPatch: (key: string, patch: Partial<CaptureFieldSpec>) => void;
  onRemove: (key: string) => void;
}) {
  const type = field.type ?? "text";
  const entry = FIELD_CATALOG[type];
  const isConsent = type === "consent";
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {entry?.name ?? type} field
      </p>
      {type !== "wallet" ? (
        <Field label={isConsent ? "Consent copy" : "Label"}>
          {isConsent ? (
            <Textarea
              rows={3}
              value={field.label ?? ""}
              onChange={(e) => onPatch(field.key, { label: e.target.value })}
            />
          ) : (
            <Input
              className="h-9"
              value={field.label ?? ""}
              onChange={(e) => onPatch(field.key, { label: e.target.value })}
            />
          )}
        </Field>
      ) : (
        <p className="text-xs leading-relaxed text-muted-foreground">
          The Connect wallet button is the identity anchor - it can&apos;t be
          relabelled.
        </p>
      )}
      {entry?.canRequire ? (
        <label className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Required</span>
          <Switch
            checked={field.required ?? false}
            onCheckedChange={(v) => onPatch(field.key, { required: v })}
          />
        </label>
      ) : null}
      {!entry?.fixed ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => onRemove(field.key)}
        >
          <XMarkIcon className="size-4" aria-hidden="true" />
          Remove field
        </Button>
      ) : null}
    </div>
  );
}

// --------------------------------------------------------------- Display tab

function TimingPanel({
  meta,
  onTiming,
}: {
  meta: FormMeta;
  onTiming: (t: FormTiming) => void;
}) {
  const t = meta.timing;
  const set = (patch: Partial<FormTiming>) => onTiming({ ...t, ...patch });
  const applies = timingApplies(meta.style, meta.surface);
  return (
    <div className="space-y-3">
      <Field label="Where it shows">
        <Select
          value={t.pages}
          onValueChange={(v) => set({ pages: v })}
          disabled={meta.surface === "hosted"}
        >
          <SelectTrigger className="h-9" aria-label="Where it shows">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <InformationCircleIcon
          className="mt-0.5 size-3.5 shrink-0"
          aria-hidden="true"
        />
        {meta.surface === "hosted"
          ? "Hosted pages open from their own link - timing rules below don't apply."
          : "Inline forms show in place - timing rules apply to overlays (Pop-up, Slide-in, Hello bar)."}
      </p>
      {applies ? (
        <>
          <Field label="When it appears">
            <Select
              value={t.trigger}
              onValueChange={(v) => set({ trigger: v as FormTrigger })}
            >
              <SelectTrigger className="h-9" aria-label="When it appears">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {t.trigger === "delay" ? (
            <Field label="Delay (seconds)">
              <Input
                type="number"
                min={0}
                value={t.delay}
                onChange={(e) => set({ delay: Number(e.target.value) })}
                className="h-9"
              />
            </Field>
          ) : null}
          {t.trigger === "scroll" ? (
            <Field label="Scroll depth (%)">
              <Input
                type="number"
                min={0}
                max={100}
                value={t.scroll}
                onChange={(e) => set({ scroll: Number(e.target.value) })}
                className="h-9"
              />
            </Field>
          ) : null}
          <Field label="Frequency">
            <Select value={t.freq} onValueChange={(v) => set({ freq: v })}>
              <SelectTrigger className="h-9" aria-label="Frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQ_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </>
      ) : null}
    </div>
  );
}

// -------------------------------------------------------------- Settings tab

function SettingsPanel({
  name,
  tag,
  origins,
  listId,
  lists,
  automations,
  display,
  meta,
  fields,
  onName,
  onTag,
  onOrigins,
  onListId,
  onDisplay,
  onMeta,
}: {
  name: string;
  tag: string;
  origins: string;
  listId: string;
  lists: Named[];
  automations: Named[];
  display: Required<FormDisplaySettings>;
  meta: FormMeta;
  fields: CaptureFieldSpec[];
  onName: (v: string) => void;
  onTag: (v: string) => void;
  onOrigins: (v: string) => void;
  onListId: (v: string) => void;
  onDisplay: (d: Required<FormDisplaySettings>) => void;
  onMeta: (updater: (m: FormMeta) => FormMeta) => void;
}) {
  const emailReachable = fields.some((f) => (f.type ?? "text") === "email");
  const pushReachable = fields.some((f) => (f.type ?? "text") === "wallet");
  const widgetStyles = FORM_STYLES.filter((s) => s.surface === "widget");
  const app = meta.appearance;
  const after = meta.afterSubmit;

  const setApp = (patch: Partial<FormAppearance>) =>
    onMeta((m) => ({ ...m, appearance: { ...m.appearance, ...patch } }));
  const setAfter = (patch: Partial<typeof after>) =>
    onMeta((m) => ({ ...m, afterSubmit: { ...m.afterSubmit, ...patch } }));
  const setDisp = (patch: Partial<FormDisplaySettings>) =>
    onDisplay({ ...display, ...patch });
  const setSurface = (surface: FormSurface) =>
    onMeta((m) => {
      const style: FormStyleId =
        surface === "hosted"
          ? "hosted"
          : m.style === "hosted"
            ? "inline"
            : m.style;
      return { ...m, surface, style };
    });
  const setStyle = (style: FormStyleId) =>
    onMeta((m) => ({ ...m, style, surface: surfaceForStyle(style) }));
  const setType = (type: FormCaptureType) => onMeta((m) => ({ ...m, type }));

  return (
    <div className="space-y-4">
      {/* Type + surface */}
      <Section>
        <Field label="Form type">
          <Select
            value={meta.type}
            onValueChange={(v) => setType(v as FormCaptureType)}
          >
            <SelectTrigger className="h-9" aria-label="Form type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="identity">
                Identity capture - wallet + verified link
              </SelectItem>
              <SelectItem value="lead">
                Lead capture - email, wallet optional
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Seg
          label="Surface"
          value={meta.surface}
          options={[
            ["widget", "Embed widget"],
            ["hosted", "Hosted page"],
          ]}
          onChange={(v) => setSurface(v as FormSurface)}
        />
        {meta.surface === "widget" ? (
          <Field label="Widget style">
            <Select
              value={meta.style}
              onValueChange={(v) => setStyle(v as FormStyleId)}
            >
              <SelectTrigger className="h-9" aria-label="Widget style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {widgetStyles.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}
        <div className="space-y-1 rounded-md bg-muted/40 p-2.5 text-xs">
          <p className="font-medium text-foreground">
            This form makes contacts
          </p>
          <Reach
            on={emailReachable}
            yes="Email-reachable"
            no="Email-reachable - add an Email field"
          />
          <Reach
            on={pushReachable}
            yes="Push-reachable"
            no="Push-reachable - add Connect wallet"
          />
        </div>
      </Section>

      {/* Header */}
      <Section title="Header">
        <Field label="Brand name">
          <Input
            className="h-9"
            value={display.brandName}
            placeholder="Acme"
            onChange={(e) => setDisp({ brandName: e.target.value })}
          />
        </Field>
        <Field label="Title">
          <Input
            className="h-9"
            value={display.headline}
            onChange={(e) => setDisp({ headline: e.target.value })}
          />
        </Field>
        <Field label="Subtitle">
          <Textarea
            rows={2}
            value={display.description}
            onChange={(e) => setDisp({ description: e.target.value })}
          />
        </Field>
      </Section>

      {/* Style */}
      <Section title="Style">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Accent</Label>
          <div className="flex gap-2">
            {ACCENT_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Accent ${c}`}
                onClick={() => setApp({ accent: c })}
                style={{ backgroundColor: c }}
                className={cn(
                  "size-7 rounded-full ring-offset-2 ring-offset-background",
                  app.accent === c
                    ? "ring-2 ring-foreground"
                    : "ring-1 ring-border"
                )}
              />
            ))}
          </div>
        </div>
        <Seg
          label="Background"
          value={app.bg}
          options={BG_OPTIONS}
          onChange={(v) => setApp({ bg: v as FormAppearance["bg"] })}
        />
        <Seg
          label="Corners"
          value={app.corners}
          options={CORNER_OPTIONS}
          onChange={(v) => setApp({ corners: v as FormAppearance["corners"] })}
        />
        <Seg
          label="Button"
          value={app.button}
          options={BUTTON_OPTIONS}
          onChange={(v) => setApp({ button: v as FormAppearance["button"] })}
        />
        <label className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Hero image</span>
          <Switch
            checked={app.hero}
            onCheckedChange={(v) => setApp({ hero: v })}
          />
        </label>
      </Section>

      {/* Consent & verification */}
      <Section title="Consent & verification">
        {meta.type === "identity" ? (
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheckIcon
              className="mt-0.5 size-3.5 shrink-0 text-primary"
              aria-hidden="true"
            />
            Identity forms verify the wallet↔email link with a ZK proof at
            submit - no extra confirmation email needed.
          </p>
        ) : (
          <label className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Double opt-in (email confirm)
            </span>
            <Switch
              checked={meta.doubleOptIn}
              onCheckedChange={(v) => onMeta((m) => ({ ...m, doubleOptIn: v }))}
            />
          </label>
        )}
      </Section>

      {/* Where contacts land */}
      <Section title="Where contacts land">
        <Field label="Add subscribers to list">
          <Select
            value={listId || "none"}
            onValueChange={(v) => onListId(v === "none" ? "" : v)}
          >
            <SelectTrigger className="h-9" aria-label="Add subscribers to list">
              <SelectValue placeholder="No list" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No list</SelectItem>
              {lists.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Everyone who submits joins this list. Use lists to target campaigns
          and trigger automations.
        </p>
        <Field label="Auto-tag new contacts">
          <Input
            className="h-9"
            value={tag}
            placeholder="season-2"
            onChange={(e) => onTag(e.target.value)}
          />
        </Field>
      </Section>

      {/* After submit */}
      <Section title="After submit">
        <Field label="On completion">
          <Select
            value={after.onCompletion}
            onValueChange={(v) =>
              setAfter({ onCompletion: v as FormCompletion })
            }
          >
            <SelectTrigger className="h-9" aria-label="On completion">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPLETION_OPTIONS.map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {after.onCompletion === "message" ? (
          <Field label="Thank-you message">
            <Textarea
              rows={2}
              value={display.successMessage}
              onChange={(e) => setDisp({ successMessage: e.target.value })}
            />
          </Field>
        ) : null}
        {after.onCompletion === "redirect" ? (
          <Field label="Redirect URL">
            <Input
              className="h-9"
              value={after.redirectUrl}
              placeholder="https://acme.com/welcome"
              onChange={(e) => setAfter({ redirectUrl: e.target.value })}
            />
          </Field>
        ) : null}
        {after.onCompletion === "reveal" ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            After verifying, the visitor sees whether their wallet is eligible
            and, if so, their allowlist status - computed via ZK against your
            contracts.
          </p>
        ) : null}
        <label className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Enrol into automation</span>
          <Switch
            checked={after.enrolAutomation}
            onCheckedChange={(v) => setAfter({ enrolAutomation: v })}
          />
        </label>
        {after.enrolAutomation ? (
          <Select
            value={after.automationId ?? "none"}
            onValueChange={(v) =>
              setAfter({
                automationId: v === "none" ? null : v,
                automationName:
                  automations.find((a) => a.id === v)?.name ?? null,
              })
            }
          >
            <SelectTrigger className="h-9" aria-label="Automation">
              <SelectValue placeholder="Choose an automation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {automations.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </Section>

      {/* Advanced */}
      <Section title="Advanced">
        <Field label="Form name">
          <Input
            className="h-9"
            value={name}
            onChange={(e) => onName(e.target.value)}
          />
        </Field>
        {meta.surface === "widget" ? (
          <Field label="Allowed origins">
            <Input
              className="h-9"
              value={origins}
              placeholder="https://acme.xyz"
              onChange={(e) => onOrigins(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Comma-separated. Leave empty to allow any origin.
            </p>
          </Field>
        ) : null}
      </Section>
    </div>
  );
}

// ------------------------------------------------------------------ Share tab

function ShareTab({
  surface,
  publicUrl,
  embedCode,
  submitUrl,
}: {
  surface: FormSurface;
  publicUrl: string;
  embedCode: string;
  submitUrl: string;
}) {
  const [qrOpen, setQrOpen] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const copy = () => {
    navigator.clipboard
      .writeText(publicUrl)
      .then(() => toast.success("Link copied"))
      .catch(() => toast.error("Couldn't copy"));
  };
  const downloadQr = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
      type: "image/svg+xml",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "form-qr.svg";
    a.click();
    URL.revokeObjectURL(url);
  };
  if (surface === "hosted") {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ArrowUpTrayIcon className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Hosted page</p>
            <p className="text-xs text-muted-foreground">
              Share this link anywhere - no site needed. We host and secure the
              page.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Input readOnly value={publicUrl} className="font-mono text-sm" />
          <Button variant="outline" onClick={copy}>
            Copy
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={publicUrl} target="_blank" rel="noreferrer">
              <ArrowUpTrayIcon className="size-4" aria-hidden="true" />
              Open
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>
            <QrCodeIcon className="size-4" aria-hidden="true" />
            QR code
          </Button>
        </div>

        <Dialog open={qrOpen} onOpenChange={setQrOpen}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle>Scan to open the form</DialogTitle>
            </DialogHeader>
            <div
              ref={qrRef}
              className="mx-auto rounded-xl bg-white p-4"
              style={{ width: "fit-content" }}
            >
              <QRCode value={publicUrl || " "} size={200} />
            </div>
            <p className="truncate text-center text-xs text-muted-foreground">
              {publicUrl}
            </p>
            <Button variant="outline" size="sm" onClick={downloadQr}>
              <ArrowDownTrayIcon className="size-4" aria-hidden="true" />
              Download SVG
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Public form link</Label>
        <div className="flex gap-2">
          <Input readOnly value={publicUrl} className="font-mono text-sm" />
          <Button variant="outline" onClick={copy}>
            Copy
          </Button>
          <Button variant="outline" asChild>
            <a href={publicUrl} target="_blank" rel="noreferrer">
              <ArrowUpTrayIcon className="size-4" aria-hidden="true" />
              Open
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Share this link, or embed the snippet below on your site.
        </p>
      </div>
      <EmbedSnippet embedCode={embedCode} submitUrl={submitUrl} />
    </div>
  );
}

// --------------------------------------------------------------------- atoms

function Section({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      {title ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
      ) : null}
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Seg({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div
        className="grid gap-1 rounded-lg border border-border p-0.5"
        style={{
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
        }}
      >
        {options.map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              value === v
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function Reach({ on, yes, no }: { on: boolean; yes: string; no: string }) {
  return (
    <p
      className={cn(
        "flex items-center gap-1.5",
        on ? "text-primary" : "text-muted-foreground"
      )}
    >
      {on ? (
        <CheckIcon className="size-3.5" aria-hidden="true" />
      ) : (
        <XMarkIcon className="size-3.5" aria-hidden="true" />
      )}
      {on ? yes : no}
    </p>
  );
}
