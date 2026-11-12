"use client";

import { SentIcon } from "@hugeicons/core-free-icons";
import { useState } from "react";

import { SETUP_GUIDES } from "../../data/setup-guides";
import type { ChannelId } from "../../types/channel";
import { HandoffDialog } from "./handoff-dialog";
import { Icon } from "@/shared/components/common/hugeicon";

/**
 * Handoff at the blocker, not on a page of its own: every channel that is not
 * live yet carries this line, so a dead end has a way out.
 */
export function HandoffInline({ channel }: { channel: ChannelId }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
      >
        <Icon icon={SentIcon} className="size-3.5" />
        Not your job? Send this to {SETUP_GUIDES[channel].who}
      </button>
      {open ? (
        <HandoffDialog
          open
          onOpenChange={setOpen}
          channels={[channel]}
          preselect={[channel]}
        />
      ) : null}
    </>
  );
}
