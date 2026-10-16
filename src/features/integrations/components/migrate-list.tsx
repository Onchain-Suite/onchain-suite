"use client";

import {
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import type { Migration } from "../types/sources";
import { searchMigrations } from "../utils/sources";

/**
 * Migrating in from another tool. Deliberately not a grid of logos: the question
 * at this moment is not "which do you support" (they know what they are leaving)
 * but "what comes across, and what do I lose". So it is a search and a row per
 * tool, and each row answers both before anything starts.
 *
 * Per-tool migrations are stubbed for now (toast); the CSV fallback is the real
 * path until the per-tool importers land (see migration/integrations.md).
 */
export function MigrateList() {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Migration | null>(null);
  const rows = searchMigrations(q);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
        <InformationCircleIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
        <span className="min-w-0 flex-1 text-muted-foreground">
          Coming from something not listed? Export a CSV and import it, or tell
          us and we will look at it.
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast("We'll be in touch about your tool")}
        >
          Ask us
        </Button>
      </div>

      <div className="relative max-w-xl">
        <MagnifyingGlassIcon
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
          aria-label="Search tools to migrate from"
          placeholder="Search the tool you are moving from"
          className="pl-9"
        />
      </div>

      {rows.length === 0 ? (
        <p className="max-w-xl text-sm text-muted-foreground">
          No migration built for &ldquo;{q.trim()}&rdquo; yet. A CSV export from
          it will import here: wallet or email, one row per contact.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border">
          {rows.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="text-sm font-medium text-foreground">
                  {m.name}
                </div>
                <div className="text-xs text-muted-foreground">{m.brings}</div>
                {m.leaves ? (
                  <div className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                    <InformationCircleIcon
                      aria-hidden="true"
                      className="size-3.5"
                    />
                    {m.leaves}
                  </div>
                ) : null}
              </div>
              <Button variant="outline" size="sm" onClick={() => setPicked(m)}>
                Migrate
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(picked)}
        onOpenChange={(open) => {
          if (!open) setPicked(null);
        }}
      >
        <DialogContent>
          {picked ? (
            <>
              <DialogHeader>
                <DialogTitle>Migrate from {picked.name}</DialogTitle>
                <DialogDescription>
                  <span className="font-medium text-foreground">
                    What comes across.
                  </span>{" "}
                  {picked.brings}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                {picked.leaves ? (
                  <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-amber-700 dark:text-amber-300">
                    <ExclamationTriangleIcon
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0"
                    />
                    <span>{picked.leaves}.</span>
                  </p>
                ) : null}
                <p className="text-muted-foreground">
                  Contacts arrive suppressed-safe: anyone unsubscribed in{" "}
                  {picked.name} stays unsubscribed here, and nothing is sent to
                  anyone as part of a migration.
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setPicked(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const { name } = picked;
                    setPicked(null);
                    toast.success(
                      `${name} migration started. We'll email you when it finishes`
                    );
                  }}
                >
                  <ArrowTopRightOnSquareIcon
                    aria-hidden="true"
                    className="mr-1.5 size-4"
                  />
                  Connect {picked.name}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
