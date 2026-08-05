"use client";

import {
  ArrowLeftIcon,
  ArrowUpTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/ui/button";
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

import { cn } from "@/lib/utils";

import { FORMS_FARCASTER_ENABLED } from "../config";
import {
  type CaptureFieldSpec,
  type CaptureFieldType,
  type FormDisplaySettings,
  readDisplaySettings,
  writeDisplaySettings,
} from "../forms.service";
import { useForm, useUpdateForm } from "../hooks/use-forms";
import { EmbedSnippet } from "./embed-snippet";
import { FormRenderer } from "./form-renderer";
import { SubmissionsTab } from "./submissions-tab";

type Tab = "build" | "submissions" | "share";
type BuildTab = "fields" | "display" | "settings";

const FIELD_PALETTE: {
  type: CaptureFieldType;
  label: string;
  icon: typeof EnvelopeIcon;
  defaultLabel: string;
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
    icon: PlusIcon,
    defaultLabel: "Your answer",
  },
  { type: "x", label: "Link X", icon: PlusIcon, defaultLabel: "X (Twitter)" },
  {
    type: "farcaster",
    label: "Link Farcaster",
    icon: PlusIcon,
    defaultLabel: "Farcaster",
  },
  {
    type: "consent",
    label: "Consent",
    icon: PlusIcon,
    defaultLabel: "Consent",
  },
  {
    type: "wallet",
    label: "Connect wallet",
    icon: WalletIcon,
    defaultLabel: "Wallet",
  },
];

const uniqueKey = (base: string, taken: Set<string>) => {
  let key = base;
  let n = 1;
  while (taken.has(key)) key = `${base}_${n++}`;
  return key;
};

export function FormBuilder({ id }: { id: string }) {
  const { data: form, isLoading, isError } = useForm(id);
  const saveMutation = useUpdateForm(undefined, { successToast: "Saved" });
  const statusMutation = useUpdateForm(undefined, { successToast: null });

  const [tab, setTab] = useState<Tab>("build");
  const [buildTab, setBuildTab] = useState<BuildTab>("fields");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  // Staged edits, seeded from the loaded form.
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [status, setStatus] = useState("active");
  const [origins, setOrigins] = useState("");
  const [zk, setZk] = useState(false);
  const [fields, setFields] = useState<CaptureFieldSpec[]>([]);
  const [display, setDisplay] = useState<Required<FormDisplaySettings>>(
    readDisplaySettings(undefined)
  );

  useEffect(() => {
    if (!form) return;
    setName(form.name);
    setTag(form.tag ?? "");
    setStatus(form.status);
    setOrigins(form.allowedOrigins.join(", "));
    setZk(form.zkEnabled);
    setFields(form.fields.length > 0 ? form.fields : []);
    setDisplay(readDisplaySettings(form.settings));
  }, [form]);

  const buildInput = () => ({
    name: name.trim() || "Untitled form",
    tag: tag.trim() || null,
    status,
    zkEnabled: zk,
    fields: fields.filter((f) => f.key.trim().length > 0),
    allowedOrigins: origins
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
    settings: writeDisplaySettings(form?.settings, display),
  });

  const save = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    saveMutation.mutate({ id, input: buildInput() });
  };

  const toggleLive = () => {
    const next = status === "active" ? "paused" : "active";
    setStatus(next);
    statusMutation.mutate(
      { id, input: { ...buildInput(), status: next } },
      {
        onSuccess: () =>
          toast.success(next === "active" ? "Form is live" : "Form paused"),
      }
    );
  };

  const hasWallet = fields.some((f) => (f.type ?? "text") === "wallet");
  const hasConsent = fields.some((f) => (f.type ?? "text") === "consent");

  const addField = (type: CaptureFieldType, defaultLabel: string) => {
    if (type === "wallet" && hasWallet) return;
    if (type === "consent" && hasConsent) return;
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
    setBuildTab("fields");
  };

  const patchField = (index: number, patch: Partial<CaptureFieldSpec>) =>
    setFields(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  const removeField = (index: number) =>
    setFields(fields.filter((_, i) => i !== index));
  const moveField = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[index], next[j]] = [next[j], next[index]];
    setFields(next);
  };

  const publicUrl = useMemo(() => {
    if (!form) return "";
    if (typeof window === "undefined") return `/f/${form.publicToken}`;
    return `${window.location.origin}/f/${form.publicToken}`;
  }, [form]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Loading form…
      </div>
    );
  }
  if (isError || !form) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load this form.
        </p>
        <Button asChild variant="outline">
          <Link href="/forms">Back to forms</Link>
        </Button>
      </div>
    );
  }

  const live = status === "active";

  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/forms"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
            Forms
          </Link>
          <span className="text-border">|</span>
          <span className="truncate text-sm font-semibold text-foreground">
            {name || "Untitled form"}
          </span>
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
            {live ? "Live" : "Paused"}
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          {(["build", "submissions", "share"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors",
                tab === t
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
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
                Go live
              </>
            )}
          </Button>
          <Button size="sm" onClick={save} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </header>

      {tab === "build" ? (
        <div className="grid flex-1 grid-cols-1 gap-6 pt-6 lg:grid-cols-[320px_1fr]">
          {/* Left config panel */}
          <div className="space-y-4">
            <div className="flex gap-4 border-b border-border">
              {(["fields", "display", "settings"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBuildTab(t)}
                  className={cn(
                    "-mb-px border-b-2 pb-2.5 text-sm font-medium capitalize transition-colors",
                    buildTab === t
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {buildTab === "fields" ? (
              <FieldsPanel
                fields={fields}
                hasWallet={hasWallet}
                hasConsent={hasConsent}
                onAdd={addField}
                onPatch={patchField}
                onRemove={removeField}
                onMove={moveField}
              />
            ) : null}

            {buildTab === "display" ? (
              <DisplayPanel display={display} onChange={setDisplay} />
            ) : null}

            {buildTab === "settings" ? (
              <SettingsPanel
                name={name}
                tag={tag}
                status={status}
                origins={origins}
                zk={zk}
                onName={setName}
                onTag={setTag}
                onStatus={setStatus}
                onOrigins={setOrigins}
                onZk={setZk}
              />
            ) : null}
          </div>

          {/* Preview */}
          <div className="rounded-2xl border border-border bg-muted/20 p-6">
            <div className="mb-4 flex items-center justify-center gap-1 rounded-lg border border-border bg-background p-0.5 w-fit mx-auto">
              {(
                [
                  {
                    key: "desktop",
                    label: "Desktop",
                    Icon: ComputerDesktopIcon,
                  },
                  {
                    key: "mobile",
                    label: "Mobile",
                    Icon: DevicePhoneMobileIcon,
                  },
                ] as const
              ).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDevice(key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    device === key
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <FormRenderer
              name={name}
              fields={fields}
              displayOverride={display}
              zkEnabled={zk}
              device={device}
            />
            <p className="mx-auto mt-4 max-w-md text-center text-xs text-muted-foreground">
              Live preview of the hosted form at{" "}
              <span className="font-mono">/f/{form.publicToken}</span>
            </p>
          </div>
        </div>
      ) : null}

      {tab === "submissions" ? (
        <div className="flex-1 pt-6">
          <SubmissionsTab
            formId={id}
            csvUrl={`/api/v1/forms/${id}/submissions/export.csv`}
          />
        </div>
      ) : null}

      {tab === "share" ? (
        <div className="flex-1 space-y-6 pt-6">
          <div className="space-y-2">
            <Label>Public form link</Label>
            <div className="flex gap-2">
              <Input readOnly value={publicUrl} className="font-mono text-sm" />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard
                    .writeText(publicUrl)
                    .then(() => toast.success("Link copied"))
                    .catch(() => toast.error("Couldn't copy"));
                }}
              >
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
              Share this link or embed the snippet below on your site.
            </p>
          </div>
          <EmbedSnippet embedCode={form.embedCode} submitUrl={form.submitUrl} />
        </div>
      ) : null}
    </div>
  );
}

function FieldsPanel({
  fields,
  hasWallet,
  hasConsent,
  onAdd,
  onPatch,
  onRemove,
  onMove,
}: {
  fields: CaptureFieldSpec[];
  hasWallet: boolean;
  hasConsent: boolean;
  onAdd: (type: CaptureFieldType, defaultLabel: string) => void;
  onPatch: (index: number, patch: Partial<CaptureFieldSpec>) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, dir: -1 | 1) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Add a field
        </p>
        <div className="grid grid-cols-2 gap-2">
          {FIELD_PALETTE.filter(
            (f) => f.type !== "farcaster" || FORMS_FARCASTER_ENABLED
          ).map((item) => {
            const disabled =
              (item.type === "wallet" && hasWallet) ||
              (item.type === "consent" && hasConsent);
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
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Fields ({fields.length})
        </p>
        {fields.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            No fields yet — add Connect wallet + Email for a wallet-first form.
          </p>
        ) : (
          fields.map((field, index) => (
            <div
              key={field.key}
              className="space-y-2 rounded-lg border border-border bg-card p-2.5"
            >
              <div className="flex items-center gap-1.5">
                <span className="flex-1 truncate text-xs font-medium capitalize text-muted-foreground">
                  {field.type ?? "text"}
                </span>
                <button
                  type="button"
                  onClick={() => onMove(index, -1)}
                  disabled={index === 0}
                  className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ChevronUpIcon className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(index, 1)}
                  disabled={index === fields.length - 1}
                  className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ChevronDownIcon className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="rounded p-1 text-destructive hover:bg-destructive/10"
                  aria-label="Remove field"
                >
                  <TrashIcon className="size-3.5" />
                </button>
              </div>
              {field.type !== "wallet" ? (
                <Input
                  value={field.label ?? ""}
                  onChange={(e) => onPatch(index, { label: e.target.value })}
                  placeholder="Label"
                  className="h-8 text-xs"
                />
              ) : null}
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={field.required ?? false}
                  onCheckedChange={(v) => onPatch(index, { required: v })}
                />
                Required
              </label>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DisplayPanel({
  display,
  onChange,
}: {
  display: Required<FormDisplaySettings>;
  onChange: (next: Required<FormDisplaySettings>) => void;
}) {
  const set = (patch: Partial<FormDisplaySettings>) =>
    onChange({ ...display, ...patch });
  return (
    <div className="space-y-3">
      <Field label="Brand name">
        <Input
          value={display.brandName}
          onChange={(e) => set({ brandName: e.target.value })}
          placeholder="Vault77"
          className="h-9"
        />
      </Field>
      <Field label="Headline">
        <Input
          value={display.headline}
          onChange={(e) => set({ headline: e.target.value })}
          className="h-9"
        />
      </Field>
      <Field label="Description">
        <Textarea
          value={display.description}
          onChange={(e) => set({ description: e.target.value })}
          rows={3}
        />
      </Field>
      <Field label="Submit button label">
        <Input
          value={display.submitLabel}
          onChange={(e) => set({ submitLabel: e.target.value })}
          className="h-9"
        />
      </Field>
      <Field label="Consent text">
        <Textarea
          value={display.consentLabel}
          onChange={(e) => set({ consentLabel: e.target.value })}
          rows={3}
        />
      </Field>
      <Field label="Success message">
        <Textarea
          value={display.successMessage}
          onChange={(e) => set({ successMessage: e.target.value })}
          rows={2}
        />
      </Field>
      <Field label="Accent color">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={display.accent}
            onChange={(e) => set({ accent: e.target.value })}
            className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
            aria-label="Accent color"
          />
          <Input
            value={display.accent}
            onChange={(e) => set({ accent: e.target.value })}
            className="h-9 font-mono text-sm"
          />
        </div>
      </Field>
      <label className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
        <span>
          <span className="font-medium text-foreground">Show ZK note</span>
          <span className="block text-xs text-muted-foreground">
            Zero-knowledge reassurance line under the button.
          </span>
        </span>
        <Switch
          checked={display.showZkNote}
          onCheckedChange={(v) => set({ showZkNote: v })}
        />
      </label>
    </div>
  );
}

function SettingsPanel({
  name,
  tag,
  status,
  origins,
  zk,
  onName,
  onTag,
  onStatus,
  onOrigins,
  onZk,
}: {
  name: string;
  tag: string;
  status: string;
  origins: string;
  zk: boolean;
  onName: (v: string) => void;
  onTag: (v: string) => void;
  onStatus: (v: string) => void;
  onOrigins: (v: string) => void;
  onZk: (v: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Form name">
        <Input
          value={name}
          onChange={(e) => onName(e.target.value)}
          className="h-9"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tag">
          <Input
            value={tag}
            onChange={(e) => onTag(e.target.value)}
            placeholder="waitlist"
            className="h-9"
          />
        </Field>
        <Field label="Status">
          <Select value={status} onValueChange={onStatus}>
            <SelectTrigger className="h-9" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["active", "paused", "archived"].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Allowed origins">
        <Input
          value={origins}
          onChange={(e) => onOrigins(e.target.value)}
          placeholder="https://vault77.xyz"
          className="h-9"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Comma-separated. Leave empty to allow any origin.
        </p>
      </Field>
      <label className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
        <span>
          <span className="font-medium text-foreground">ZK encryption</span>
          <span className="block text-xs text-muted-foreground">
            Blind-index + encrypt captured PII at rest.
          </span>
        </span>
        <Switch checked={zk} onCheckedChange={onZk} />
      </label>
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
