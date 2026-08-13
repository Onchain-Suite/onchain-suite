"use client";

import {
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { toast } from "sonner";

import { CopyButton } from "@/components/common/copy-button";

import { cn } from "@/lib/utils";

import { SettingsCard, StatusPill } from "../settings-card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

// TODO(backend): keys + webhooks are frontend-only state for now - wire to the
// management API when it ships (list/create/revoke keys, list/create/delete
// webhook endpoints). See docs/campaign-inapp-backend-needs.md.
const BASE_URL = "https://api.onchainsuite.com/api/v1";
const AUTH_HEADER = "Authorization: Bearer sk_live_…";

const WEBHOOK_EVENTS = [
  "message.delivered",
  "message.viewed",
  "message.clicked",
  "contact.created",
  "contact.unsubscribed",
  "automation.completed",
] as const;

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

interface SecretKey {
  id: string;
  name: string;
  prefix: string;
  full: string;
  scope: "Read/write" | "Read only";
}

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
}

let counter = 0;
const uid = () => {
  counter += 1;
  return `id_${counter}_${(counter * 2654435761) % 1_000_000}`;
};

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

export function DeveloperApiCard() {
  const [keys, setKeys] = useState<SecretKey[]>([]);
  const [creatingKey, setCreatingKey] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [revealKey, setRevealKey] = useState<SecretKey | null>(null);

  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [addingWebhook, setAddingWebhook] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>([
    "message.delivered",
  ]);

  const createKey = () => {
    const name = keyName.trim();
    if (name.length === 0) {
      toast.error("Name the key so you can find it later.");
      return;
    }
    const secret = `sk_live_${uid().replace(/[^a-z0-9]/gi, "")}${Math.abs(
      (name.length * 2654435761) % 1_000_000
    )}`;
    const key: SecretKey = {
      id: uid(),
      name,
      prefix: `${secret.slice(0, 12)}…`,
      full: secret,
      scope: "Read/write",
    };
    setKeys((prev) => [key, ...prev]);
    setRevealKey(key);
    setKeyName("");
    setCreatingKey(false);
  };

  const revokeKey = (id: string) => {
    setKeys((prev) => prev.filter((k) => k.id !== id));
    if (revealKey?.id === id) setRevealKey(null);
    toast.success("Key revoked.");
  };

  const toggleEvent = (event: string) =>
    setWebhookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );

  const addWebhook = () => {
    const url = webhookUrl.trim();
    if (!/^https:\/\//i.test(url)) {
      toast.error("Enter an HTTPS endpoint URL.");
      return;
    }
    if (webhookEvents.length === 0) {
      toast.error("Select at least one event.");
      return;
    }
    setWebhooks((prev) => [
      { id: uid(), url, events: [...webhookEvents] },
      ...prev,
    ]);
    setWebhookUrl("");
    setWebhookEvents(["message.delivered"]);
    setAddingWebhook(false);
    toast.success("Endpoint added.");
  };

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
          {!creatingKey ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreatingKey(true)}
            >
              <PlusIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
              Create key
            </Button>
          ) : null}
        </div>

        {/* Inline create form (no modal) */}
        {creatingKey ? (
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-border/60 bg-background/40 p-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="new-key-name">Key name</Label>
              <Input
                id="new-key-name"
                autoFocus
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g. production-server"
                className="h-9 rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCreatingKey(false);
                  setKeyName("");
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={createKey}>
                Create
              </Button>
            </div>
          </div>
        ) : null}

        {/* One-time full-key reveal */}
        {revealKey ? (
          <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs font-medium text-foreground">
              Copy your key now - it won&apos;t be shown again.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md bg-background px-2 py-1.5 font-mono text-xs text-foreground ring-1 ring-border">
                {revealKey.full}
              </code>
              <CopyButton value={revealKey.full} label="Copy key" />
            </div>
          </div>
        ) : null}

        <div className="mt-3 space-y-2">
          {keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No keys yet - create one to authenticate server-to-server calls.
            </p>
          ) : (
            keys.map((key) => (
              <div
                key={key.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    {key.name}
                  </div>
                  <code className="font-mono text-xs text-muted-foreground">
                    {key.prefix}
                  </code>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <StatusPill tone="neutral">{key.scope}</StatusPill>
                  <span className="text-xs text-muted-foreground">
                    Never used
                  </span>
                  <button
                    type="button"
                    onClick={() => revokeKey(key.id)}
                    className="text-sm font-medium text-destructive hover:underline"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Webhooks */}
      <div className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-foreground">Webhooks</h4>
          {!addingWebhook ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddingWebhook(true)}
            >
              <PlusIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
              Add endpoint
            </Button>
          ) : null}
        </div>

        {/* Inline add-endpoint form (replaces the modal) */}
        {addingWebhook ? (
          <div className="mt-3 space-y-4 rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="space-y-1.5">
              <Label htmlFor="webhook-url">Endpoint URL</Label>
              <Input
                id="webhook-url"
                autoFocus
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://api.yourdapp.com/hooks/onchainsuite"
                className="h-9 rounded-lg font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                HTTPS only - events carry contact data.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map((event) => {
                  const active = webhookEvents.includes(event);
                  return (
                    <button
                      key={event}
                      type="button"
                      onClick={() => toggleEvent(event)}
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
              <p className="text-xs text-muted-foreground">
                {webhookEvents.length} selected. We retry a failed delivery for
                24 hours with backoff.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAddingWebhook(false);
                  setWebhookUrl("");
                  setWebhookEvents(["message.delivered"]);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={addWebhook}>
                Add endpoint
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-3 space-y-2">
          {webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No endpoints. Add one to receive delivery and contact events.
            </p>
          ) : (
            webhooks.map((hook) => (
              <div
                key={hook.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <code className="block truncate font-mono text-sm text-foreground">
                    {hook.url}
                  </code>
                  <span className="text-xs text-muted-foreground">
                    {hook.events.join(", ")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setWebhooks((prev) => prev.filter((h) => h.id !== hook.id))
                  }
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                  aria-label="Remove endpoint"
                >
                  <TrashIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))
          )}
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
    </SettingsCard>
  );
}

export default DeveloperApiCard;
