"use client";

import { CheckCircleIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

import { CopyButton } from "@/components/common/copy-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { connectorFor } from "../../data/connectors";
import { FRESHNESS } from "../../data/sources";
import { requestSource } from "../../hooks/use-requested-sources";
import type { DataSource } from "../../types/sources";
import { setupDocUrl } from "../../utils/sources";
import { ConnectorPanel } from "../connect/connector-panel";
import { EventsApiPanel } from "./events-api-panel";
import { SourceActions } from "./source-actions";
import { FreshChip } from "./source-visuals";

/** Sources that are the events API itself rather than a connector. */
const EVENTS_API_SOURCES = new Set(["sdk", "webhook-in"]);

/**
 * Connect a source. Where the backend has a connector, this is the real
 * credential form with live verification, then the source's sync controls.
 * Where it does not, it says so and hands over the setup doc, rather than
 * pretending to connect.
 */
export function ConnectSourceDialog({
  source,
  onOpenChange,
}: {
  source: DataSource | null;
  onOpenChange: (open: boolean) => void;
}) {
  const def = source ? connectorFor(source.id) : null;

  return (
    <Dialog open={Boolean(source)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {source ? (
          <>
            <DialogHeader>
              <DialogTitle>Connect {source.name}</DialogTitle>
              <DialogDescription>
                {source.configure ?? source.about ?? source.gives}
              </DialogDescription>
            </DialogHeader>

            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <FreshChip freshness={source.freshness} />
              <span>{FRESHNESS[source.freshness].can}</span>
            </p>

            {def ? (
              <ConnectorPanel def={def}>
                {() => <SourceActions def={def} />}
              </ConnectorPanel>
            ) : EVENTS_API_SOURCES.has(source.id) ? (
              <EventsApiPanel />
            ) : (
              <NotBuilt source={source} />
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function NotBuilt({ source }: { source: DataSource }) {
  const [asked, setAsked] = useState(false);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        The {source.name} connector isn&apos;t built yet, so there&apos;s
        nothing to connect here today. Tell us you need it and it moves up the
        list.
      </p>
      {asked ? (
        <p className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircleIcon aria-hidden="true" className="size-4" />
          Asked for. We&rsquo;ll email you when it lands.
        </p>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            requestSource(source.name);
            setAsked(true);
          }}
        >
          <PlusIcon aria-hidden="true" className="mr-1.5 size-4" />
          Ask for {source.name}
        </Button>
      )}
      <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
        <div className="text-xs text-muted-foreground">
          The setup guide, for whoever does the integration:
        </div>
        <div className="flex items-center gap-1.5">
          <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs text-foreground">
            {setupDocUrl(source.id)}
          </code>
          <CopyButton value={setupDocUrl(source.id)} label="Copy setup link" />
        </div>
      </div>
    </div>
  );
}
