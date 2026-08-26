"use client";

import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CopyButton } from "@/components/common/copy-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";

import { formatRelativeTime } from "@/lib/date";
import { cn } from "@/lib/utils";

import {
  type CreateKeyInput,
  type DeveloperKey,
  type DeveloperKeyWithToken,
  developerService,
  type KeyScope,
  type KeyStatus,
  type WebhookEndpoint,
  type WebhookStatus,
} from "../../developer.service";
import { SettingsCard, StatusPill } from "../settings-card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

const BASE_URL = "https://api.onchainsuite.com/api/v1";
const AUTH_HEADER = "Authorization: Bearer sk_live_…";

// Signature header developers must verify on every delivery. Kept inline (not a
// doc link) because HMAC verification is where integrations get abandoned.
const SIGNATURE_HEADER =
  'X-OnChain-Signature: t=<unix>,v1=HMAC_SHA256(secret, "<t>.<rawBody>")';

const ENDPOINTS: { method: "POST" | "GET"; path: string; desc: string }[] = [
  {
    method: "POST",
    path: "/identify",
    desc: "Link a connected wallet to the workspace. Wallet addresses only.",
  },
  {
    method: "POST",
    path: "/events",
    desc: "Send a custom event to trigger automations.",
  },
  {
    method: "GET",
    path: "/contacts",
    desc: "List contacts with reachability and tags.",
  },
  {
    method: "POST",
    path: "/campaigns/:id/send",
    desc: "Trigger a prepared campaign.",
  },
  {
    method: "GET",
    path: "/messages/pending",
    desc: "Queued in-app pushes for a wallet. Called by the SDK on connect.",
  },
];

const KEYS_QUERY_KEY = ["developer", "keys"] as const;
const WEBHOOKS_QUERY_KEY = ["developer", "webhooks"] as const;
const WEBHOOK_EVENTS_QUERY_KEY = ["developer", "webhook-events"] as const;

/** A copyable Base URL / Auth header row. */
function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">
        {label}
      </span>
      <code className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
        {value}
      </code>
      <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} />
    </div>
  );
}

function MethodBadge({ method }: { method: "POST" | "GET" }) {
  return (
    <span
      className={cn(
        "inline-flex w-14 justify-center rounded-md px-2 py-1 font-mono text-[11px] font-semibold",
        method === "GET"
          ? "bg-primary/10 text-primary"
          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      )}
    >
      {method}
    </span>
  );
}

function EnvironmentBadge({ environment }: { environment: "live" | "test" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase",
        environment === "live"
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground"
      )}
    >
      {environment}
    </span>
  );
}

/**
 * Key row state is driven off `status`, NEVER off `revokedAt` being truthy - a
 * rolled key has a future `revokedAt` and is still serving traffic while
 * `status: "expiring"`.
 */
function KeyStatusPill({ status }: { status: KeyStatus }) {
  if (status === "revoked")
    return <StatusPill tone="danger">Revoked</StatusPill>;
  if (status === "expiring")
    return <StatusPill tone="pending">Expiring</StatusPill>;
  return <StatusPill tone="success">Active</StatusPill>;
}

function WebhookStatusPill({ status }: { status: WebhookStatus }) {
  if (status === "failing")
    return <StatusPill tone="danger">Failing</StatusPill>;
  if (status === "paused")
    return <StatusPill tone="neutral">Paused</StatusPill>;
  return <StatusPill tone="success">Active</StatusPill>;
}

/** One-time reveal-and-copy panel for a `token` / `whsec_…` secret. */
function RevealSecret({ value, helper }: { value: string; helper?: string }) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <ShieldCheckIcon aria-hidden="true" className="h-4 w-4 text-primary" />
        Copy this now - you will not see it again.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-background px-2 py-1.5 font-mono text-xs text-foreground ring-1 ring-border">
          {value}
        </code>
        <CopyButton value={value} label="Copy secret" />
      </div>
      {helper ? (
        <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

// --- Create secret key modal ------------------------------------------------

function CreateKeyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [environment, setEnvironment] =
    useState<CreateKeyInput["environment"]>("test");
  const [name, setName] = useState("");
  const [scope, setScope] = useState<KeyScope>("read_write");
  const [revealed, setRevealed] = useState<DeveloperKeyWithToken | null>(null);

  const reset = () => {
    setEnvironment("test");
    setName("");
    setScope("read_write");
    setRevealed(null);
  };

  const mutation = useMutation({
    mutationFn: () =>
      developerService.createKey({
        environment,
        name: name.trim() || undefined,
        scope,
      }),
    onSuccess: (created) => {
      setRevealed(created);
      queryClient.invalidateQueries({ queryKey: KEYS_QUERY_KEY });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Couldn't create key."),
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {revealed ? (
          <>
            <DialogHeader>
              <DialogTitle>Secret key created</DialogTitle>
              <DialogDescription>
                Store it in your server config now.
              </DialogDescription>
            </DialogHeader>
            <RevealSecret
              value={revealed.token}
              helper="Use it as a bearer token: Authorization: Bearer <token>. Never ship it in browser code."
            />
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create secret key</DialogTitle>
              <DialogDescription>
                A server-side credential. It grants full API access - keep it
                out of frontend code.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="create-key-name">Name (optional)</Label>
                <Input
                  id="create-key-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. production-server"
                  className="h-9 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label>Environment</Label>
                <RadioGroup
                  value={environment}
                  onValueChange={(v) =>
                    setEnvironment(v as CreateKeyInput["environment"])
                  }
                  className="grid grid-cols-2 gap-2"
                >
                  {(
                    [
                      {
                        value: "test",
                        title: "Test",
                        desc: "POST /events dry-runs. Safe against production data.",
                      },
                      {
                        value: "live",
                        title: "Live",
                        desc: "Events fire automations and really send.",
                      },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      htmlFor={`env-${opt.value}`}
                      className={cn(
                        "flex cursor-pointer gap-2 rounded-lg border p-3 text-sm transition-colors",
                        environment === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <RadioGroupItem
                        id={`env-${opt.value}`}
                        value={opt.value}
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium text-foreground">
                          {opt.title}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {opt.desc}
                        </span>
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Scope</Label>
                <RadioGroup
                  value={scope}
                  onValueChange={(v) => setScope(v as KeyScope)}
                  className="grid grid-cols-2 gap-2"
                >
                  {(
                    [
                      { value: "read_write", title: "Read and write" },
                      { value: "read_only", title: "Read only" },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      htmlFor={`scope-${opt.value}`}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors",
                        scope === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <RadioGroupItem
                        id={`scope-${opt.value}`}
                        value={opt.value}
                      />
                      <span className="font-medium text-foreground">
                        {opt.title}
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Creating…" : "Create key"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- Roll secret key modal --------------------------------------------------

function RollKeyDialog({
  keyRow,
  onOpenChange,
}: {
  keyRow: DeveloperKey | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"leaked" | "planned">("leaked");
  const [hours, setHours] = useState(24);
  const [revealed, setRevealed] = useState<DeveloperKeyWithToken | null>(null);

  const reset = () => {
    setMode("leaked");
    setHours(24);
    setRevealed(null);
  };

  const mutation = useMutation({
    mutationFn: () => {
      if (!keyRow) throw new Error("No key selected.");
      const expireInHours =
        mode === "leaked" ? 0 : Math.min(168, Math.max(0, hours));
      return developerService.rollKey(keyRow.id, { expireInHours });
    },
    onSuccess: (rolled) => {
      setRevealed(rolled);
      queryClient.invalidateQueries({ queryKey: KEYS_QUERY_KEY });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Couldn't roll key."),
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={keyRow !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {revealed ? (
          <>
            <DialogHeader>
              <DialogTitle>Replacement key issued</DialogTitle>
              <DialogDescription>
                {revealed.replaced?.expiresAt
                  ? `The old key stops working ${formatRelativeTime(
                      revealed.replaced.expiresAt
                    )}.`
                  : "The old key has been expired."}
              </DialogDescription>
            </DialogHeader>
            <RevealSecret
              value={revealed.token}
              helper="Deploy this to your servers before the old key expires."
            />
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                Roll {keyRow?.name ? `"${keyRow.name}"` : "key"}
              </DialogTitle>
              <DialogDescription>
                Issue a replacement that inherits this key&apos;s name, scope
                and environment.
              </DialogDescription>
            </DialogHeader>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as "leaked" | "planned")}
              className="gap-2"
            >
              <label
                htmlFor="roll-leaked"
                className={cn(
                  "flex cursor-pointer gap-2 rounded-lg border p-3 text-sm transition-colors",
                  mode === "leaked"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <RadioGroupItem
                  id="roll-leaked"
                  value="leaked"
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">
                    It leaked - stop the old key immediately
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    The current key stops accepting traffic right away.
                  </span>
                </span>
              </label>
              <label
                htmlFor="roll-planned"
                className={cn(
                  "flex cursor-pointer gap-2 rounded-lg border p-3 text-sm transition-colors",
                  mode === "planned"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <RadioGroupItem
                  id="roll-planned"
                  value="planned"
                  className="mt-0.5"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground">
                    Planned rotation - keep the old key working
                  </span>
                  <span className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    Grace period
                    <Input
                      type="number"
                      min={0}
                      max={168}
                      value={hours}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        setHours(
                          Number.isFinite(n)
                            ? Math.min(168, Math.max(0, Math.round(n)))
                            : 0
                        );
                      }}
                      onClick={(e) => e.preventDefault()}
                      disabled={mode !== "planned"}
                      className="h-8 w-20 rounded-lg"
                    />
                    hours (0-168)
                  </span>
                </span>
              </label>
            </RadioGroup>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Rolling…" : "Roll key"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- Revoke secret key modal ------------------------------------------------

/**
 * Revoking is destructive and immediate, so it goes through a confirm dialog -
 * a stray click should never kill a live key. For zero-downtime rotation the
 * copy points the user at Roll instead.
 */
function RevokeKeyDialog({
  keyRow,
  onOpenChange,
}: {
  keyRow: DeveloperKey | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => developerService.revokeKey(id),
    onSuccess: () => {
      toast.success("Key revoked.");
      queryClient.invalidateQueries({ queryKey: KEYS_QUERY_KEY });
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Couldn't revoke key."),
  });

  return (
    <Dialog open={keyRow !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Revoke {keyRow?.name ? `"${keyRow.name}"` : "this key"}?
          </DialogTitle>
          <DialogDescription>
            Any server still authenticating with this key stops working
            immediately, and this can&apos;t be undone. To rotate without
            downtime, use Roll instead.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Keep it
          </Button>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => keyRow && mutation.mutate(keyRow.id)}
          >
            {mutation.isPending ? "Revoking…" : "Revoke key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Create webhook modal ---------------------------------------------------

function CreateWebhookDialog({
  open,
  onOpenChange,
  catalog,
  catalogLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: string[];
  catalogLoading: boolean;
}) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  const reset = () => {
    setUrl("");
    setSelected([]);
    setRevealed(null);
    setUrlError(null);
  };

  const mutation = useMutation({
    mutationFn: () =>
      developerService.createWebhook({ url: url.trim(), events: selected }),
    onSuccess: (created) => {
      setRevealed(created.secret);
      queryClient.invalidateQueries({ queryKey: WEBHOOKS_QUERY_KEY });
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Couldn't add endpoint.";
      // Surface an https / topic 400 next to the field, not just as a toast.
      if (/https|url/i.test(message)) setUrlError(message);
      toast.error(message);
    },
  });

  const submit = () => {
    setUrlError(null);
    if (!/^https:\/\//i.test(url.trim())) {
      setUrlError(
        "Endpoint URL must start with https:// - events carry contact data."
      );
      return;
    }
    if (selected.length === 0) {
      toast.error("Select at least one event.");
      return;
    }
    mutation.mutate();
  };

  const toggle = (event: string) =>
    setSelected((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {revealed ? (
          <>
            <DialogHeader>
              <DialogTitle>Endpoint added</DialogTitle>
              <DialogDescription>
                Save this signing secret - it verifies deliveries came from us.
              </DialogDescription>
            </DialogHeader>
            <RevealSecret
              value={revealed}
              helper="Use it to verify the X-OnChain-Signature header on every delivery."
            />
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add webhook endpoint</DialogTitle>
              <DialogDescription>
                We POST signed events here. HTTPS only.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="webhook-url">Endpoint URL</Label>
                <Input
                  id="webhook-url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (urlError) setUrlError(null);
                  }}
                  placeholder="https://api.yourdapp.com/hooks/onchainsuite"
                  className="h-9 rounded-lg font-mono text-sm"
                  aria-invalid={urlError !== null}
                />
                {urlError ? (
                  <p className="flex items-center gap-1.5 text-xs text-destructive">
                    <ExclamationTriangleIcon
                      aria-hidden="true"
                      className="h-3.5 w-3.5"
                    />
                    {urlError}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    HTTPS only - events carry contact data.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Events</Label>
                {catalogLoading ? (
                  <div className="flex flex-wrap gap-2">
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-7 w-32 rounded-md" />
                    ))}
                  </div>
                ) : catalog.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No subscribable topics available.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {catalog.map((event) => {
                      const active = selected.includes(event);
                      return (
                        <button
                          key={event}
                          type="button"
                          onClick={() => toggle(event)}
                          className={cn(
                            "rounded-md border px-2 py-1 font-mono text-xs transition-colors",
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {event}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {selected.length} selected. Failed deliveries retry with
                  backoff for ~24h.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button onClick={submit} disabled={mutation.isPending}>
                {mutation.isPending ? "Adding…" : "Add endpoint"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- Rows -------------------------------------------------------------------

function KeyRow({
  keyRow,
  onRoll,
  onRevoke,
}: {
  keyRow: DeveloperKey;
  onRoll: (key: DeveloperKey) => void;
  onRevoke: (key: DeveloperKey) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {keyRow.name || "Unnamed key"}
          </span>
          <EnvironmentBadge environment={keyRow.environment} />
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <code className="font-mono text-xs text-muted-foreground">
            {keyRow.prefix || "sk_••••"}
          </code>
          <span className="text-xs text-muted-foreground">
            {keyRow.scope === "read_only" ? "Read only" : "Read and write"}
          </span>
          <span className="text-xs text-muted-foreground">
            {keyRow.lastUsedAt
              ? `Used ${formatRelativeTime(keyRow.lastUsedAt)}`
              : "Never used"}
          </span>
          {keyRow.status === "expiring" && keyRow.revokedAt ? (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              Stops working {formatRelativeTime(keyRow.revokedAt)}
            </span>
          ) : null}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <KeyStatusPill status={keyRow.status} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRoll(keyRow)}
          type="button"
        >
          <ArrowPathIcon aria-hidden="true" className="h-3.5 w-3.5" />
          Roll
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRevoke(keyRow)}
          type="button"
          className="text-destructive hover:text-destructive"
        >
          Revoke
        </Button>
      </div>
    </div>
  );
}

function WebhookRow({
  hook,
  onTest,
  onToggleStatus,
  onDelete,
  busy,
}: {
  hook: WebhookEndpoint;
  onTest: (id: string) => void;
  onToggleStatus: (hook: WebhookEndpoint) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <code className="block truncate font-mono text-sm text-foreground">
            {hook.url}
          </code>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="truncate">
              {hook.events.length > 0 ? hook.events.join(", ") : "No topics"}
            </span>
            {hook.secretHint ? (
              <code className="font-mono">{hook.secretHint}</code>
            ) : null}
            {hook.lastDeliveryStatus ? (
              <span>
                Last delivery: {hook.lastDeliveryStatus}
                {hook.lastDeliveryAt
                  ? ` (${formatRelativeTime(hook.lastDeliveryAt)})`
                  : ""}
              </span>
            ) : null}
            {hook.failureCount > 0 ? (
              <span className="text-amber-600 dark:text-amber-400">
                {hook.failureCount} consecutive failure
                {hook.failureCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
        </div>
        <WebhookStatusPill status={hook.status} />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTest(hook.id)}
            disabled={busy}
            type="button"
          >
            Send test
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleStatus(hook)}
            disabled={busy}
            type="button"
          >
            {hook.status === "paused" ? "Resume" : "Pause"}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(hook.id)}
            disabled={busy}
            type="button"
            className="text-muted-foreground hover:text-destructive"
            aria-label="Delete endpoint"
          >
            <TrashIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Card -------------------------------------------------------------------

export function DeveloperApiCard() {
  const queryClient = useQueryClient();

  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [rollTarget, setRollTarget] = useState<DeveloperKey | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<DeveloperKey | null>(null);
  const [addWebhookOpen, setAddWebhookOpen] = useState(false);

  const keysQuery = useQuery({
    queryKey: KEYS_QUERY_KEY,
    queryFn: () => developerService.listKeys(),
  });

  const webhooksQuery = useQuery({
    queryKey: WEBHOOKS_QUERY_KEY,
    queryFn: () => developerService.listWebhooks(),
  });

  const eventsQuery = useQuery({
    queryKey: WEBHOOK_EVENTS_QUERY_KEY,
    queryFn: () => developerService.listWebhookEvents(),
  });

  const testWebhookMutation = useMutation({
    mutationFn: (id: string) => developerService.testWebhook(id),
    onSuccess: () => {
      toast.success("Test delivery sent.");
      queryClient.invalidateQueries({ queryKey: WEBHOOKS_QUERY_KEY });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Test delivery failed."),
  });

  const toggleWebhookMutation = useMutation({
    mutationFn: (hook: WebhookEndpoint) =>
      developerService.updateWebhook(hook.id, {
        status: hook.status === "paused" ? "active" : "paused",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: WEBHOOKS_QUERY_KEY }),
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Couldn't update endpoint."
      ),
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: (id: string) => developerService.deleteWebhook(id),
    onSuccess: () => {
      toast.success("Endpoint deleted.");
      queryClient.invalidateQueries({ queryKey: WEBHOOKS_QUERY_KEY });
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Couldn't delete endpoint."
      ),
  });

  // A revoked key is dead - drop it from the list entirely rather than showing
  // a struck-through row.
  const keys = (keysQuery.data ?? []).filter((key) => key.status !== "revoked");
  const webhooks = webhooksQuery.data ?? [];
  const catalog = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);

  const webhookBusy =
    testWebhookMutation.isPending ||
    toggleWebhookMutation.isPending ||
    deleteWebhookMutation.isPending;

  return (
    <SettingsCard
      title="Developer API"
      description="Keys, webhooks and endpoints - included on every plan"
    >
      {/* Base URL + auth header */}
      <div className="space-y-2">
        <ConfigRow label="Base URL" value={BASE_URL} />
        <ConfigRow label="Auth header" value={AUTH_HEADER} />
      </div>

      {/* Secret keys */}
      <div className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-foreground">Secret keys</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateKeyOpen(true)}
          >
            <PlusIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
            Create key
          </Button>
        </div>

        <div className="mt-3 space-y-2">
          {keysQuery.isLoading ? (
            <>
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </>
          ) : keysQuery.isError ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                Couldn&apos;t load keys.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => keysQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No keys yet - create one to authenticate server-to-server calls.
            </p>
          ) : (
            keys.map((key) => (
              <KeyRow
                key={key.id}
                keyRow={key}
                onRoll={setRollTarget}
                onRevoke={setRevokeTarget}
              />
            ))
          )}
        </div>
      </div>

      {/* Webhooks */}
      <div className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-foreground">Webhooks</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddWebhookOpen(true)}
          >
            <PlusIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
            Add endpoint
          </Button>
        </div>

        <div className="mt-3 space-y-2">
          {webhooksQuery.isLoading ? (
            <>
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </>
          ) : webhooksQuery.isError ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                Couldn&apos;t load endpoints.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => webhooksQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No endpoints. Add one to receive delivery and contact events.
            </p>
          ) : (
            webhooks.map((hook) => (
              <WebhookRow
                key={hook.id}
                hook={hook}
                onTest={(id) => testWebhookMutation.mutate(id)}
                onToggleStatus={(h) => toggleWebhookMutation.mutate(h)}
                onDelete={(id) => deleteWebhookMutation.mutate(id)}
                busy={webhookBusy}
              />
            ))
          )}
        </div>

        {/* HMAC verification reference - inline, not a doc link. */}
        <div className="mt-3 rounded-xl border border-border/60 bg-background/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-foreground">
              Verify every delivery
            </p>
            <CopyButton
              value={SIGNATURE_HEADER}
              label="Copy signature format"
            />
          </div>
          <code className="mt-2 block overflow-x-auto whitespace-pre rounded-md bg-background px-3 py-2 font-mono text-xs text-foreground ring-1 ring-border">
            {SIGNATURE_HEADER}
          </code>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>
              Sign the <strong>raw</strong> request body - re-serializing the
              JSON (<code className="font-mono">JSON.stringify</code>) reorders
              keys and the signature will never match.
            </li>
            <li>Compare signatures with a constant-time equality check.</li>
          </ul>
        </div>
      </div>

      {/* Endpoints reference */}
      <div className="mt-8">
        <h4 className="text-sm font-semibold text-foreground">Endpoints</h4>
        <div className="mt-3 divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60">
          {ENDPOINTS.map((ep) => (
            <div
              key={ep.path}
              className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex shrink-0 items-center gap-3 sm:w-72">
                <MethodBadge method={ep.method} />
                <code className="font-mono text-sm text-foreground">
                  {ep.path}
                </code>
              </div>
              <p className="text-sm text-muted-foreground">{ep.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheckIcon
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
          />
          <span>
            <code className="font-mono">/identify</code> takes a wallet address
            and rejects email, phone or any other personal identifier - sending
            one would hand you the wallet↔identity mapping your subscribers were
            told you cannot see.
          </span>
        </p>
      </div>

      <CreateKeyDialog open={createKeyOpen} onOpenChange={setCreateKeyOpen} />
      <RollKeyDialog
        keyRow={rollTarget}
        onOpenChange={(open) => {
          if (!open) setRollTarget(null);
        }}
      />
      <RevokeKeyDialog
        keyRow={revokeTarget}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
      />
      <CreateWebhookDialog
        open={addWebhookOpen}
        onOpenChange={setAddWebhookOpen}
        catalog={catalog}
        catalogLoading={eventsQuery.isLoading}
      />
    </SettingsCard>
  );
}

export default DeveloperApiCard;
