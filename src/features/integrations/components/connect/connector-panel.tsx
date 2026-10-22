"use client";

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import type { ConnectionSummary } from "../../contracts/connections";
import {
  useConnection,
  useConnectionMutations,
} from "../../hooks/use-connections";
import type { ConnectorDef } from "../../types/connectors";
import { connectionLabel, connectionState } from "../../utils/connections";
import { ConnectionForm } from "./connection-form";

const when = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/**
 * The whole connect lifecycle for one connector: role gate, the form, the
 * verified or rejected state, replace and disconnect. What a connected
 * connector can then do (sync, migrate, opt-in) comes in as `children`.
 */
export function ConnectorPanel({
  def,
  children,
}: {
  def: ConnectorDef;
  children?: (conn: ConnectionSummary) => ReactNode;
}) {
  const { connection, canManage, isLoading, error, organizationId } =
    useConnection(def.id);
  const { remove } = useConnectionMutations();
  const [replacing, setReplacing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (isLoading) return <Skeleton className="h-28 w-full rounded-xl" />;

  if (!canManage) {
    return (
      <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Only a workspace owner or admin can connect {def.label}.
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        {error.message}
      </p>
    );
  }

  const state = connectionState(connection);

  if (!connection || replacing) {
    return (
      <ConnectionForm
        def={def}
        orgId={organizationId}
        onCancel={replacing ? () => setReplacing(false) : undefined}
        onSaved={(conn) => {
          setReplacing(false);
          if (conn.verified) toast.success(`${def.label} connected`);
        }}
      />
    );
  }

  const label = connectionLabel(connection);
  const verified = when(connection.verifiedAt);

  return (
    <div className="space-y-4">
      {state === "connected" ? (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-sm">
          <CheckCircleIcon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
          />
          <span className="min-w-0 flex-1 text-foreground">
            Connected{label ? ` as ${label}` : ""}
            {verified ? (
              <span className="text-muted-foreground">
                {" "}
                · verified {verified}
              </span>
            ) : null}
          </span>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-300">
          <ExclamationTriangleIcon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          <span className="min-w-0 flex-1">
            {`Saved, but ${def.label} didn't accept it${
              connection.lastError ? `: ${connection.lastError}` : "."
            }`}
          </span>
        </div>
      )}

      {state === "connected" && children ? children(connection) : null}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setReplacing(true)}>
          {state === "connected" ? "Replace credential" : "Try again"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => setConfirming(true)}
        >
          Disconnect
        </Button>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {def.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              The stored credential is deleted. Contacts already brought in
              stay; nothing new arrives or sends through {def.label} until you
              connect again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                remove.mutate(def.id, {
                  onSuccess: () => toast.success(`${def.label} disconnected`),
                  onError: (e) => toast.error(e.message),
                })
              }
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
