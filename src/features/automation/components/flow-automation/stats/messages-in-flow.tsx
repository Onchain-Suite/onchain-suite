"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { MessageRow } from "@/features/automation/utils/message-stats";
import {
  formatOpenRange,
  formatRate,
  OPEN_RANGE_EXPLANATION,
} from "@/features/campaigns/utils/human-engagement";

function ClickedCell({ row }: { row: MessageRow }) {
  const c = row.counts;
  if (!c) return <>-</>;
  if (c.human.humanClicks === null) return <>{c.clicked.toLocaleString()}</>;
  return (
    <span className="flex flex-col items-end">
      <span>
        {c.human.humanClicks.toLocaleString()}
        {c.human.humanClickRate !== null ? (
          <span className="text-muted-foreground">
            {" "}
            · {formatRate(c.human.humanClickRate)}
          </span>
        ) : null}
      </span>
      {c.clicked !== c.human.humanClicks ? (
        <span className="text-xs text-muted-foreground">
          {c.clicked.toLocaleString()} incl. scanners
        </span>
      ) : null}
    </span>
  );
}

function OpenedCell({ row }: { row: MessageRow }) {
  const c = row.counts;
  if (!c) return <>-</>;
  const { opens } = c.human;
  if (!opens) return <>{c.opened.toLocaleString()}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex cursor-help flex-col items-end">
          <span>{formatOpenRange(opens)}</span>
          <span className="text-xs text-muted-foreground">
            Apple {opens.apple.toLocaleString()} · machine{" "}
            {opens.machine.toLocaleString()} · raw {opens.raw.toLocaleString()}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {OPEN_RANGE_EXPLANATION}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * The automation Stats tab's per-message table. Clicks come first and count
 * people (scanner clicks taken out); opens show as a range because Apple Mail
 * Privacy Protection and bots inflate them. Older data without the human
 * fields shows the plain counts it always did.
 */
export function MessagesInFlow({ rows }: { rows: MessageRow[] }) {
  const hasCounts = rows.some((r) => r.counts !== null);
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h3 className="font-semibold">Messages in this flow</h3>
        <span className="text-xs text-muted-foreground">
          In the order they send
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border/50 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <th className="px-6 py-3">Message</th>
              <th className="px-6 py-3 text-right">Sent</th>
              <th className="px-6 py-3 text-right">Clicked</th>
              <th className="px-6 py-3 text-right">Opened / Viewed</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="px-6 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {m.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.channel}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums text-foreground">
                    {m.counts ? m.counts.sent.toLocaleString() : "-"}
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums text-foreground">
                    <ClickedCell row={m} />
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums text-foreground">
                    <OpenedCell row={m} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-16 text-center text-sm text-muted-foreground"
                >
                  Add a Send Email or Send In-App step to see it here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border/50 px-6 py-3 text-xs leading-relaxed text-muted-foreground">
        Each message is measured against the wallets that reached it.
        {hasCounts
          ? " Opens and clicks are counted once per recipient; in-app read receipts aren't tracked yet."
          : " Per-message delivery counts appear here once a message has sent."}
      </div>
    </div>
  );
}
