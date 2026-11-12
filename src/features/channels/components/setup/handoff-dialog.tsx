"use client";

import {
  ArrowDown01Icon,
  Copy01Icon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { SETUP_GUIDES } from "../../data/setup-guides";
import type { ChannelId } from "../../types/channel";
import { handoffMinutes, handoffText } from "../../utils/handoff";
import { CHANNEL_ICON } from "../channel-icons";
import { useOrgSwitcherContextOptional } from "@/features/common/layout/components/org-switcher-context";
import { Icon } from "@/shared/components/common/hugeicon";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

const TEAM_HREF = "/settings?tab=team";

/**
 * Hand setup to whoever holds the keys. Pick the channels, read exactly what
 * they will be asked to do, and copy it: the steps, the thing people get wrong
 * and a link that lands on the right page. It is copied, not emailed from
 * here, so it goes wherever the team already talks; someone outside the
 * workspace is invited from Team and access first.
 */
export function HandoffDialog({
  open,
  onOpenChange,
  channels,
  preselect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Channels still to set up: the only ones worth handing over. */
  channels: readonly ChannelId[];
  preselect?: readonly ChannelId[];
}) {
  const workspace = useOrgSwitcherContextOptional()?.activeOrg?.name;
  const [picked, setPicked] = useState<ChannelId[]>(() =>
    (preselect?.length ? preselect : channels).filter((id) =>
      channels.includes(id)
    )
  );
  const [expanded, setExpanded] = useState<ChannelId | null>(
    preselect?.length === 1 ? (preselect[0] ?? null) : null
  );

  const toggle = (id: ChannelId) =>
    setPicked((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  // Copied in list order, whatever order they were ticked in.
  const ordered = channels.filter((id) => picked.includes(id));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        handoffText(ordered, { origin: window.location.origin, workspace })
      );
      toast.success("Instructions copied. Paste them to whoever will do it.");
      onOpenChange(false);
    } catch {
      toast.error("Copy failed. Open a step and select the text by hand.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Send setup to someone else</DialogTitle>
          <DialogDescription>
            Each task comes with its own steps and a link back here, and turns
            green on this page as it is finished.
          </DialogDescription>
        </DialogHeader>

        {channels.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Every channel is connected. There is nothing left to hand over.
          </p>
        ) : (
          <ul className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {channels.map((id) => {
              const guide = SETUP_GUIDES[id];
              const on = picked.includes(id);
              const isOpen = expanded === id;
              const checkboxId = `handoff-${id}`;
              return (
                <li
                  key={id}
                  className={cn(
                    "rounded-xl border px-3 py-2.5",
                    on ? "border-primary/40 bg-primary/5" : "border-border"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={checkboxId}
                      checked={on}
                      onCheckedChange={() => toggle(id)}
                    />
                    <label
                      htmlFor={checkboxId}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5"
                    >
                      <Icon
                        icon={CHANNEL_ICON[id]}
                        className="size-4 shrink-0 text-muted-foreground"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">
                          {guide.task}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          For {guide.who}, about {guide.minutes} min
                        </span>
                      </span>
                    </label>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setExpanded(isOpen ? null : id)}
                      className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {isOpen ? "Hide" : "What they get"}
                      <Icon
                        icon={ArrowDown01Icon}
                        className={cn(
                          "size-3.5 transition-transform",
                          isOpen && "rotate-180"
                        )}
                      />
                    </button>
                  </div>
                  {isOpen ? (
                    <div className="mt-2.5 border-t border-border pt-2.5">
                      <ol className="list-decimal space-y-1 pl-5 text-xs leading-5 text-muted-foreground">
                        {guide.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                      <p className="mt-2 text-xs leading-5 text-amber-700 dark:text-amber-400">
                        {guide.gotcha}
                      </p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {channels.length > 0 ? (
          <p className="text-xs leading-5 text-muted-foreground">
            {ordered.length > 0
              ? `They get ${String(ordered.length)}${
                  ordered.length === 1 ? " task" : " tasks"
                }, the steps and a link back here. About ${String(
                  handoffMinutes(ordered)
                )} minutes of work in total.`
              : "Pick what you want to hand over. Anything left unticked stays yours to do here."}
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link href={TEAM_HREF}>
              <Icon icon={UserAdd01Icon} className="size-4" />
              Invite them to the workspace
            </Link>
          </Button>
          <Button onClick={copy} disabled={ordered.length === 0}>
            <Icon icon={Copy01Icon} className="size-4" />
            Copy instructions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
