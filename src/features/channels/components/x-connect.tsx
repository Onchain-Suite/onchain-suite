"use client";

import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { X_STATUS_KEY, xService } from "../x.service";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";

const SOON =
  "X authorisation is still being built. You'll be able to connect your X app here soon.";

/**
 * The X channel panel. X reports two things separately - the connection and the
 * addressable audience - and does not read as done until both are real, so an
 * operator never builds a campaign for an audience of zero. The OAuth connect is
 * net-new backend work, so "Authorise" is stubbed for now (see
 * migration/channels.md step 3); the status read is forward-compatible.
 */
export function XConnect() {
  const { organizationId } = useAccountOrg();
  const [handle, setHandle] = useState("");

  const statusQuery = useQuery({
    queryKey: X_STATUS_KEY(organizationId),
    enabled: Boolean(organizationId),
    retry: false,
    queryFn: () => xService.getStatus(organizationId ?? undefined),
  });

  if (statusQuery.isLoading) {
    return <Skeleton className="h-28 w-full rounded-xl" />;
  }

  const x = statusQuery.data;

  if (!x || x.status === "none") {
    return (
      <div className="space-y-4">
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Authorise an X app with <strong>dm.write</strong> to send DMs from
          your account. X only permits a DM to someone who follows you or has
          DM&apos;d you first (no API tier changes that), so your followers are
          the ceiling on reach, not your segment.
        </p>
        <div className="flex max-w-md items-end gap-2">
          <div className="flex-1 space-y-1">
            <label
              htmlFor="x-handle"
              className="text-xs font-medium text-muted-foreground"
            >
              Account handle
            </label>
            <Input
              id="x-handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@acme"
              className="font-mono"
            />
          </div>
          <Button
            disabled={handle.trim().length < 2}
            onClick={() => toast.message(SOON)}
          >
            Authorise
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Account" value={`@${x.handle ?? ""}`} mono />
        <Field
          label="Scope"
          value={
            <span className="inline-flex items-center gap-2">
              dm.write
              <Badge
                variant="outline"
                className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              >
                Granted
              </Badge>
            </span>
          }
        />
        <Field
          label="Reachable followers"
          value={
            x.reachableFollowers > 0
              ? x.reachableFollowers.toLocaleString("en-US")
              : "None yet"
          }
          muted={x.reachableFollowers === 0}
        />
      </div>

      {x.status === "pending" ? (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
          <ExclamationTriangleIcon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          <span>
            Authorised, but <strong>no follower has linked a wallet yet</strong>
            . Add a &ldquo;Link X&rdquo; field to your forms so followers can be
            matched to the wallets you segment on.
          </span>
        </p>
      ) : (
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <CheckCircleIcon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
          />
          <span>
            {x.reachableFollowers.toLocaleString("en-US")} followers have a
            linked wallet and can receive a DM. Watch the report rate closely:
            enough reports revoke DM access entirely.
          </span>
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => toast.message(SOON)}>
          <ArrowPathIcon aria-hidden="true" className="mr-1.5 size-4" />
          Re-sync followers
        </Button>
        <Button variant="outline" size="sm" onClick={() => toast.message(SOON)}>
          <TrashIcon aria-hidden="true" className="mr-1.5 size-4" />
          Disconnect
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  muted,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={[
          "text-sm",
          mono ? "font-mono" : "",
          muted ? "text-muted-foreground" : "text-foreground",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </div>
    </div>
  );
}
