"use client";

import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { connectorFor } from "../../data/connectors";
import { MIGRATION_CONSENT } from "../../data/migrations";
import type { Migration } from "../../types/sources";
import { ConnectorPanel } from "../connect/connector-panel";
import { MigrationRun } from "./migration-run";

/**
 * Migrating from one tool: what comes across and what does not, then connect
 * and run. Tools with no importer yet get the CSV route, said plainly.
 */
export function MigrateDialog({
  migration,
  onOpenChange,
}: {
  migration: Migration | null;
  onOpenChange: (open: boolean) => void;
}) {
  const def = migration ? connectorFor(migration.id) : null;
  const isFile = migration?.category === "file";

  return (
    <Dialog open={Boolean(migration)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {migration ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {isFile
                  ? "Import a CSV file"
                  : `Migrate from ${migration.name}`}
              </DialogTitle>
              <DialogDescription>
                <span className="font-medium text-foreground">
                  What comes across.
                </span>{" "}
                {migration.brings}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              {migration.leaves ? (
                <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-amber-700 dark:text-amber-300">
                  <ExclamationTriangleIcon
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0"
                  />
                  <span>{migration.leaves}.</span>
                </p>
              ) : null}
              <p className="text-muted-foreground">{MIGRATION_CONSENT}</p>
            </div>

            {def ? (
              <ConnectorPanel def={def}>
                {() => <MigrationRun def={def} />}
              </ConnectorPanel>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {isFile
                    ? "Upload the file, match its columns to contact attributes, and preview the totals before anything imports."
                    : `There's no direct importer for ${migration.name} yet. Export your contacts from it as a CSV and import that: a wallet or email column, one row per contact.`}
                </p>
                <Button asChild size="sm">
                  <Link href="/audience/import-export">Import a CSV</Link>
                </Button>
              </div>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
