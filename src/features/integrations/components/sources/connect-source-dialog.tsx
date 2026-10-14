"use client";

import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

import { CopyButton } from "@/components/common/copy-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { FRESHNESS } from "../../data/sources";
import type { DataSource } from "../../types/sources";
import { setupDocUrl } from "../../utils/sources";
import { FreshChip } from "./source-visuals";

/**
 * The connect flow. Real OAuth/key/webhook exchange is net-new backend work
 * (see migration/integrations.md), so "Authorise" is a stubbed confirmation for
 * now; the setup-doc link is the real handoff to whoever does the integration.
 */
export function ConnectSourceDialog({
  source,
  onOpenChange,
}: {
  source: DataSource | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(source)} onOpenChange={onOpenChange}>
      <DialogContent>
        {source ? (
          <>
            <DialogHeader>
              <DialogTitle>Connect {source.name}</DialogTitle>
              <DialogDescription>
                {source.about ?? source.gives}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <FreshChip freshness={source.freshness} />
                <span>{FRESHNESS[source.freshness].can}</span>
              </p>

              <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">
                  Hand this to whoever does the integration:
                </div>
                <div className="flex items-center gap-1.5">
                  <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs text-foreground">
                    {setupDocUrl(source.id)}
                  </code>
                  <CopyButton
                    value={setupDocUrl(source.id)}
                    label="Copy setup link"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  toast.success(`${source.name} connected`);
                }}
              >
                <ArrowTopRightOnSquareIcon
                  aria-hidden="true"
                  className="mr-1.5 size-4"
                />
                Authorise
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
