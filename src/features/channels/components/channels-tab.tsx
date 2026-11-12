"use client";

import { ArrowRight01Icon, SentIcon } from "@hugeicons/core-free-icons";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { CHANNEL_META } from "../data/channels";
import { useChannelReadiness } from "../hooks/use-channel-readiness";
import type { ChannelId } from "../types/channel";
import { outstandingChannels } from "../utils/handoff";
import { ChannelDetail } from "./channel-detail";
import { CHANNEL_ICON } from "./channel-icons";
import { ChannelStatusBadge } from "./channel-status-badge";
import { HandoffDialog } from "./setup/handoff-dialog";
import { Icon } from "@/shared/components/common/hugeicon";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

const isChannelId = (value: string | null): value is ChannelId =>
  value !== null && value in CHANNEL_META;

/**
 * Integrations -> Channels: where messages go out. The state of every channel
 * first, one row each, with what is blocking it in plain words; open a row for
 * its setup. The open channel is in the address (`?channel=email`), so a link
 * from the setup checklist, a campaign or a handed-over task lands on it, and
 * Back returns to the list.
 */
export function ChannelsTab() {
  const { readiness, inputs, isLoading } = useChannelReadiness();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const param = searchParams?.get("channel") ?? null;
  const open = isChannelId(param) ? param : null;
  const [handing, setHanding] = useState(false);

  const query = searchParams?.toString() ?? "";
  const setOpen = useCallback(
    (id: ChannelId | null) => {
      const next = new URLSearchParams(query);
      next.set("tab", "channels");
      if (id) next.set("channel", id);
      else next.delete("channel");
      router.replace(`${pathname ?? "/integrations"}?${next.toString()}`, {
        scroll: false,
      });
    },
    [router, pathname, query]
  );

  const outstanding = useMemo(
    () => outstandingChannels(readiness),
    [readiness]
  );

  const current = readiness.find((c) => c.id === open);
  if (current) {
    return (
      <ChannelDetail
        channel={current}
        inputs={inputs}
        onBack={() => setOpen(null)}
      />
    );
  }

  const live = readiness.length - outstanding.length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">Channels</h2>
          <p className="max-w-xl text-xs leading-5 text-muted-foreground">
            {isLoading
              ? "Checking which channels can send…"
              : `${String(live)} of ${String(readiness.length)} can send.`}{" "}
            Each needs one setup. Open a channel to do it, or send the steps to
            whoever holds the keys.
          </p>
        </div>
        {!isLoading && outstanding.length > 0 ? (
          <Button variant="outline" size="sm" onClick={() => setHanding(true)}>
            <Icon icon={SentIcon} className="size-4" />
            Send setup to someone
          </Button>
        ) : null}
      </header>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {readiness.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setOpen(c.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                  <Icon icon={CHANNEL_ICON[c.id]} className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {c.label}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {c.blocker ?? CHANNEL_META[c.id].reaches}
                  </span>
                </span>
                <ChannelStatusBadge status={c.status} />
                <span className="hidden w-20 shrink-0 items-center justify-end gap-0.5 text-xs font-medium text-primary sm:inline-flex">
                  {c.status === "connected" ? "Manage" : "Set up"}
                  <Icon icon={ArrowRight01Icon} className="size-4" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {handing ? (
        <HandoffDialog open onOpenChange={setHanding} channels={outstanding} />
      ) : null}
    </div>
  );
}
