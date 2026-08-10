"use client";

import { ArrowsUpDownIcon } from "@heroicons/react/24/outline";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";

import type { Campaign } from "../../../campaigns/types";
import { formatDate } from "../../../campaigns/utils";
import { CampaignActionsCell } from "./campaign-actions-cell";
import { CampaignNameCell } from "./campaign-name-cell";
import { CampaignRateCell } from "./campaign-rate-cell";
import { CampaignStatusCell } from "./campaign-status-cell";
import { CampaignTypeCell } from "./campaign-type-cell";

/**
 * Per-column responsive visibility, applied to both the header and body
 * cells (see components/table/index.tsx). Low-value columns collapse first
 * on small screens; the table's own overflow-x container handles the rest.
 */
export interface CampaignColumnMeta {
  /** Extra classes for this column's `<th>`/`<td>` (e.g. `hidden md:table-cell`). */
  className?: string;
}

export const columns: ColumnDef<Campaign>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8 data-[state=open]:bg-accent"
        >
          Campaign Name
          <ArrowsUpDownIcon aria-hidden="true" className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <CampaignNameCell campaign={row.original} />,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <CampaignStatusCell status={row.original.status} />,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => <CampaignTypeCell type={row.original.type} />,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    meta: { className: "hidden md:table-cell" } satisfies CampaignColumnMeta,
  },
  {
    accessorKey: "recipients",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8 data-[state=open]:bg-accent"
        >
          Recipients
          <ArrowsUpDownIcon aria-hidden="true" className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const recipients = row.getValue("recipients") as number | undefined;
      const { audience } = row.original;
      const shown = audience.slice(0, 3);
      const overflow = audience.length - shown.length;
      return (
        <div className="space-y-1 text-sm text-foreground">
          {shown.length > 0 ? (
            <div className="flex max-w-56 flex-wrap gap-1">
              {shown.map((label) => (
                <span
                  key={label}
                  className="inline-flex max-w-32 truncate rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground"
                  title={label}
                >
                  {label}
                </span>
              ))}
              {overflow > 0 ? (
                <span
                  className="inline-flex rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground"
                  title={audience.slice(3).join(", ")}
                >
                  +{overflow}
                </span>
              ) : null}
            </div>
          ) : null}
          {typeof recipients === "number" ? (
            <div
              className={
                shown.length > 0 ? "text-xs text-muted-foreground" : undefined
              }
            >
              {recipients.toLocaleString()}
            </div>
          ) : shown.length === 0 ? (
            "-"
          ) : null}
        </div>
      );
    },
    meta: { className: "hidden sm:table-cell" } satisfies CampaignColumnMeta,
  },
  {
    accessorKey: "openRate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8 data-[state=open]:bg-accent"
        >
          Open Rate
          <ArrowsUpDownIcon aria-hidden="true" className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <CampaignRateCell campaign={row.original} metric="openRate" />
    ),
    meta: { className: "hidden lg:table-cell" } satisfies CampaignColumnMeta,
  },
  {
    accessorKey: "clickRate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8 data-[state=open]:bg-accent"
        >
          Click Rate
          <ArrowsUpDownIcon aria-hidden="true" className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <CampaignRateCell campaign={row.original} metric="clickRate" />
    ),
    meta: { className: "hidden lg:table-cell" } satisfies CampaignColumnMeta,
  },
  {
    id: "deliveryAt",
    header: "Sent / Scheduled",
    accessorFn: (row) => row.sentAt ?? row.scheduledFor ?? null,
    cell: ({ row }) => {
      const { sentAt, scheduledFor } = row.original;
      const label = sentAt
        ? `Sent ${formatDate(sentAt)}`
        : scheduledFor
          ? `Scheduled ${formatDate(scheduledFor)}`
          : "-";
      return <div className="text-sm text-muted-foreground">{label}</div>;
    },
    meta: { className: "hidden xl:table-cell" } satisfies CampaignColumnMeta,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8 data-[state=open]:bg-accent"
        >
          Created
          <ArrowsUpDownIcon aria-hidden="true" className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <div className="text-sm text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </div>
      );
    },
    meta: { className: "hidden xl:table-cell" } satisfies CampaignColumnMeta,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <CampaignActionsCell campaign={row.original} />,
  },
];
