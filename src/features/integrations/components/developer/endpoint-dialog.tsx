"use client";

import { Alert02Icon } from "@hugeicons/core-free-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import type { WebhookEndpoint } from "../../contracts/developer";
import { developerService } from "../../developer.service";
import { useWebhookTopics } from "../../hooks/use-webhooks";
import { groupTopics, isHttpsUrl, sameTopics } from "../../utils/developer";
import { SecretReveal } from "./secret-reveal";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";
import { Icon } from "@/shared/components/common/hugeicon";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

/** Every webhook list, whichever workspace it was read for. */
const DEVELOPER_WEBHOOKS = ["developer", "webhooks"] as const;

function EndpointForm({
  webhook,
  onClose,
  onCreated,
}: {
  webhook: WebhookEndpoint | null;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { organizationId } = useAccountOrg();
  const orgId = organizationId ?? undefined;
  const queryClient = useQueryClient();
  const topicsQuery = useWebhookTopics(true);
  const groups = useMemo(
    () => groupTopics(topicsQuery.data ?? []),
    [topicsQuery.data]
  );

  const [url, setUrl] = useState(webhook?.url ?? "");
  const [events, setEvents] = useState<string[]>(webhook?.events ?? []);
  const [secret, setSecret] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const urlOk = webhook !== null || isHttpsUrl(url);
  const changed = webhook === null || !sameTopics(events, webhook.events);
  const valid = urlOk && events.length > 0 && changed;

  const toggle = (id: string) =>
    setEvents((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );

  const save = useMutation({
    mutationFn: async () => {
      if (webhook) {
        await developerService.updateWebhook(webhook.id, { events }, orgId);
        return null;
      }
      return developerService.createWebhook({ url: url.trim(), events }, orgId);
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: DEVELOPER_WEBHOOKS });
      if (created) {
        setSecret(created.secret);
        onCreated?.(created.id);
        return;
      }
      toast.success("Endpoint saved.");
      onClose();
    },
    onError: (err) =>
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Couldn't save the endpoint."
      ),
  });

  if (secret) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Copy the signing secret now</DialogTitle>
          <DialogDescription>
            Use it to check that a delivery came from OnchainSuite. This is the
            only time it is shown in full.
          </DialogDescription>
        </DialogHeader>
        <SecretReveal
          value={secret}
          helper="Compute the HMAC-SHA256 of the timestamp and the raw body with it, and compare the result with the X-OnChain-Signature header."
        />
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </>
    );
  }

  const urlError = touched && !urlOk;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{webhook ? "Edit endpoint" : "Add endpoint"}</DialogTitle>
        <DialogDescription>
          {webhook
            ? "Choose what this endpoint hears about."
            : "We POST each event here, signed. Pick what it should hear about."}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="endpoint-url">Endpoint URL</Label>
          <Input
            id="endpoint-url"
            value={url}
            disabled={webhook !== null}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="https://api.yourdapp.com/hooks/onchainsuite"
            aria-invalid={urlError}
            aria-describedby="endpoint-url-help"
            className="h-9 rounded-lg font-mono text-sm"
          />
          <p
            id="endpoint-url-help"
            className={
              urlError
                ? "flex items-center gap-1.5 text-xs text-destructive"
                : "text-xs text-(--text-tertiary)"
            }
          >
            {urlError ? (
              <>
                <Icon icon={Alert02Icon} className="size-3.5" />
                Must be an https URL.
              </>
            ) : webhook ? (
              "The address cannot be changed. Add a new endpoint to move it."
            ) : (
              "HTTPS only. Events carry contact data."
            )}
          </p>
        </div>

        {topicsQuery.isPending ? (
          <div className="grid gap-3 sm:grid-cols-2" aria-hidden="true">
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
          </div>
        ) : groups.length === 0 ? (
          <p className="text-sm text-(--text-secondary)">
            Couldn&apos;t load the list of topics. Close this and try again.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.map((g) => (
              <fieldset
                key={g.group}
                className="flex flex-col gap-2 rounded-lg border border-(--border-subtle) px-3 pt-1 pb-3"
              >
                <legend className="px-1 text-xs font-semibold text-(--text-primary)">
                  {g.group}
                </legend>
                {g.topics.map((t) => (
                  <label
                    key={t.id}
                    className="flex cursor-pointer items-start gap-2 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={events.includes(t.id)}
                      onChange={() => toggle(t.id)}
                      className="mt-0.5 size-3.5 shrink-0 accent-primary"
                    />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <code className="font-mono text-[11.5px] text-(--text-primary)">
                        {t.id}
                      </code>
                      {t.desc ? (
                        <span className="text-(--text-tertiary)">{t.desc}</span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={save.isPending}>
          Cancel
        </Button>
        <Button
          onClick={() => save.mutate()}
          disabled={!valid || save.isPending}
        >
          {save.isPending
            ? "Saving…"
            : webhook
              ? "Save endpoint"
              : "Add endpoint"}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * Add an endpoint, or change what an existing one hears about. A new
 * endpoint's signing secret is shown once, here, before the dialog closes.
 */
export function EndpointDialog({
  target,
  onClose,
  onCreated,
}: {
  /** "new" to add one, an endpoint to edit it, null when closed. */
  target: WebhookEndpoint | "new" | null;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {target !== null ? (
          <EndpointForm
            key={target === "new" ? "new" : target.id}
            webhook={target === "new" ? null : target}
            onClose={onClose}
            onCreated={onCreated}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
