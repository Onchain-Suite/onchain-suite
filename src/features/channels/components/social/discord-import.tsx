"use client";

import { UserGroupIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { RunProgress } from "@/features/integrations/components/connect/run-progress";
import { connectionsService } from "@/features/integrations/connections.service";
import type { DiscordImportResult } from "@/features/integrations/contracts/connections";
import { usePagedRun } from "@/features/integrations/hooks/use-paged-run";

const EMPTY: DiscordImportResult = {
  guildId: "",
  scanned: 0,
  created: 0,
  alreadyImported: 0,
  skipped: 0,
  pages: 0,
  hasMore: false,
  nextCursor: null,
};

const merge = (a: DiscordImportResult, r: DiscordImportResult) => ({
  ...r,
  scanned: a.scanned + r.scanned,
  created: a.created + r.created,
  alreadyImported: a.alreadyImported + r.alreadyImported,
  skipped: a.skipped + r.skipped,
  pages: a.pages + r.pages,
});

/**
 * Bring a server's members in as contacts. Needs the bot in the server with
 * the Server Members intent on. Leave the server id blank when the bot is in
 * only one.
 */
export function DiscordImport() {
  const id = useId();
  const qc = useQueryClient();
  const [guildId, setGuildId] = useState("");
  const run = usePagedRun<DiscordImportResult>({
    step: (body, signal) =>
      connectionsService.discordImportMembers(body, signal),
    next: (prev) => {
      const g = guildId.trim();
      if (!prev) return g ? { guildId: g } : {};
      return prev.hasMore && prev.nextCursor
        ? { guildId: prev.guildId, cursor: prev.nextCursor }
        : null;
    },
    merge,
    empty: EMPTY,
    progressed: (r) => r.scanned > 0 || r.pages > 0,
  });
  const t = run.totals;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Import your server&apos;s members as contacts. Turn on the Server
        Members intent for the bot first.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-xs">
          Server ID
          <span className="ml-1 font-normal text-muted-foreground">
            optional
          </span>
        </Label>
        <Input
          id={id}
          value={guildId}
          onChange={(e) => setGuildId(e.target.value)}
          autoComplete="off"
          placeholder="Only needed if the bot is in several servers"
        />
      </div>
      {run.status !== "running" ? (
        <Button
          size="sm"
          onClick={async () => {
            await run.start();
            qc.invalidateQueries({ queryKey: ["audience"] });
          }}
        >
          <UserGroupIcon aria-hidden="true" className="mr-1.5 size-4" />
          {run.status === "idle" ? "Import members" : "Import again"}
        </Button>
      ) : null}
      {t ? (
        <RunProgress
          status={run.status}
          running="Reading members…"
          done="Members imported."
          error={run.error}
          onStop={run.stop}
          stats={[
            { label: "Read", value: t.scanned },
            { label: "New contacts", value: t.created },
            { label: "Already here", value: t.alreadyImported },
            { label: "Skipped", value: t.skipped },
          ]}
        />
      ) : null}
    </div>
  );
}
