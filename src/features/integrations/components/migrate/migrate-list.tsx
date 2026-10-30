"use client";

import {
  CheckCircleIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { cn } from "@/lib/utils";

import { connectorFor } from "../../data/connectors";
import { MIGRATION_CATEGORIES, MIGRATIONS } from "../../data/migrations";
import { useConnections } from "../../hooks/use-connections";
import { requestSource } from "../../hooks/use-requested-sources";
import type { Migration, MigrationCategory } from "../../types/sources";
import { findConnection } from "../../utils/connections";
import { searchMigrations } from "../../utils/sources";
import { MigrateDialog } from "./migrate-dialog";

/**
 * Migrating in from another tool. Deliberately not a grid of logos: the question
 * at this moment is not "which do you support" (they know what they are leaving)
 * but "what comes across, and what do I lose". So it is a search and a row per
 * tool, and each row answers both before anything starts. Tools with a backend
 * importer connect and run here; the rest take the CSV route.
 */
export function MigrateList({ reopen = null }: { reopen?: string | null }) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Migration | null>(null);
  // Back from OAuth: reopen that tool's dialog so the migration can start.
  useEffect(() => {
    if (!reopen) return;
    const m = MIGRATIONS.find((x) => connectorFor(x.id)?.id === reopen);
    if (m) setPicked(m);
  }, [reopen]);
  const { connections } = useConnections();
  const [cat, setCat] = useState<MigrationCategory | "all">("all");
  const found = searchMigrations(q);
  const rows = cat === "all" ? found : found.filter((m) => m.category === cat);
  const countFor = (id: MigrationCategory | "all") =>
    id === "all" ? found.length : found.filter((m) => m.category === id).length;

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
          onClick={() => {
            const term = q.trim();
            if (term) requestSource(term);
            toast("We'll be in touch about your tool");
          }}
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

      <div className="flex flex-wrap items-center gap-2">
        {(
          [{ id: "all" as const, label: "All" }, ...MIGRATION_CATEGORIES] as {
            id: MigrationCategory | "all";
            label: string;
          }[]
        ).map((c) => {
          const active = cat === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-sm transition-colors",
                active
                  ? "border-primary bg-primary/[0.06] text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {c.label}
              <span className="text-xs tabular-nums text-muted-foreground">
                {countFor(c.id)}
              </span>
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="max-w-xl text-sm text-muted-foreground">
          No migration built for &ldquo;{q.trim()}&rdquo; yet. A CSV export from
          it will import here: wallet or email, one row per contact.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border">
          {rows.map((m) => {
            const def = connectorFor(m.id);
            const connected = def
              ? Boolean(findConnection(connections, def.id)?.verified)
              : false;
            return (
              <div
                key={m.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    {m.name}
                    {connected ? (
                      <CheckCircleIcon
                        aria-label="Connected"
                        className="size-3.5 text-emerald-600 dark:text-emerald-400"
                      />
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.brings}
                  </div>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPicked(m)}
                >
                  {def ? "Migrate" : "Use a CSV"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <MigrateDialog
        migration={picked}
        onOpenChange={(open) => {
          if (!open) setPicked(null);
        }}
      />
    </div>
  );
}
