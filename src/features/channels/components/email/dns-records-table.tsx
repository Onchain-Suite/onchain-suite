"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";

import {
  groupDnsRecords,
  needsFix,
  recordName,
  recordValue,
  relativeHost,
} from "../../utils/dns-view";
import { type DnsRecordRow, dnsRecordStage } from "../../utils/domain-dns";
import { CopyCell } from "./copy-cell";
import { ConflictBox } from "./dns-record-parts";
import { Icon } from "@/shared/components/common/hugeicon";

const COLUMNS = "@2xl:grid-cols-[56px_minmax(0,1fr)_minmax(0,1.3fr)_112px]";
const ROW = cn(
  "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 px-3 py-2.5 @2xl:py-1.5",
  COLUMNS
);

const TONE = {
  success: "text-emerald-600 dark:text-emerald-400",
  danger: "text-destructive",
  pending: "text-muted-foreground",
  fix: "text-amber-600 dark:text-amber-400",
} as const;

/**
 * The provider's stages, in the words of someone adding records: they want to
 * know whether we can see the record yet, not how far verification has got.
 */
const STAGE_LABEL: Record<string, string> = {
  Verified: "Found",
  "In progress": "Checking",
  "Not started": "Not found",
  Failed: "Does not match",
  Pending: "Waiting",
};

/** What the status cell says. A blocked record says so before anything else. */
function statusOf(record: DnsRecordRow, checked: boolean) {
  if (needsFix(record)) {
    return { label: "Needs a fix", tone: "fix" as const, hint: "" };
  }
  if (!checked && record.verified === undefined) {
    return { label: "Not checked", tone: "pending" as const, hint: "" };
  }
  const stage = dnsRecordStage(record);
  return {
    label: STAGE_LABEL[stage.label] ?? stage.label,
    tone: stage.tone,
    hint: stage.hint,
  };
}

function RecordRow({
  record,
  zone,
  full,
  checked,
  first,
}: {
  record: DnsRecordRow;
  zone: string;
  full: boolean;
  checked: boolean;
  /** First of its group: the group's heading sits right above, so no rule. */
  first: boolean;
}) {
  const name = recordName(record);
  const type = record.type.toUpperCase();
  const status = statusOf(record, checked);
  const live =
    record.verified !== true && !record.conflict ? record.current : undefined;
  return (
    <div role="row" className={cn(ROW, !first && "border-t border-border")}>
      <span
        role="cell"
        className="justify-self-start rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground"
      >
        {type}
      </span>
      <span
        role="cell"
        title={status.hint || undefined}
        className={cn(
          "col-start-2 row-start-1 inline-flex items-center gap-1 justify-self-end whitespace-nowrap text-xs font-medium @2xl:col-start-4 @2xl:justify-self-start",
          TONE[status.tone]
        )}
      >
        {status.tone === "success" ? (
          <Icon icon={CheckmarkCircle02Icon} className="size-3.5" />
        ) : null}
        {status.label}
      </span>
      <span
        role="cell"
        className="col-span-2 min-w-0 @2xl:col-span-1 @2xl:col-start-2 @2xl:row-start-1"
      >
        <CopyCell
          value={full ? name : relativeHost(name, zone)}
          what={`host for ${type} ${name}`}
        />
      </span>
      <span
        role="cell"
        className="col-span-2 min-w-0 @2xl:col-span-1 @2xl:col-start-3 @2xl:row-start-1"
      >
        <CopyCell
          value={recordValue(record)}
          what={`value for ${type} ${name}`}
        />
      </span>
      {record.conflict ? (
        <div
          role="cell"
          className="col-span-2 @2xl:col-span-3 @2xl:col-start-2"
        >
          <ConflictBox conflict={record.conflict} />
        </div>
      ) : null}
      {live && live.length > 0 ? (
        <span
          role="cell"
          className="col-span-2 px-2 pb-1 text-xs text-muted-foreground @2xl:col-span-3 @2xl:col-start-2"
        >
          In your DNS now:{" "}
          {live.map((value) => (
            <code
              key={value}
              className="mr-1.5 break-all font-mono text-[11px]"
            >
              {value}
            </code>
          ))}
        </span>
      ) : null}
    </div>
  );
}

/**
 * A sending domain's DNS records as a table, one row each, because that is how
 * every DNS provider lays them out and the job is copying across row by row.
 * Each cell copies itself on click. A narrow container (onboarding's column)
 * gets stacked rows instead: the breakpoint is the table's own width.
 */
export function DnsRecordsTable({
  domain,
  records,
  zone,
  full,
  onFullChange,
  checked,
}: {
  domain: string;
  records: DnsRecordRow[];
  zone: string;
  /** Show whole record names instead of hosts relative to the zone. */
  full: boolean;
  onFullChange: (full: boolean) => void;
  /** DNS has been looked up at least once for these records. */
  checked: boolean;
}) {
  const groups = groupDnsRecords(records);
  const hasSpf = records.some((r) =>
    r.value.trim().toLowerCase().replace(/^"/, "").startsWith("v=spf1")
  );
  return (
    <div className="@container space-y-2.5">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label="Host format"
          className="inline-flex rounded-lg bg-muted p-0.5"
        >
          {[
            { on: false, label: "Short host" },
            { on: true, label: "Full name" },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              aria-pressed={full === option.on}
              onClick={() => onFullChange(option.on)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                full === option.on &&
                  "bg-background font-medium text-foreground shadow-sm"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {full ? (
            "For providers that want the whole name."
          ) : (
            <>
              Most providers add{" "}
              <code className="font-mono text-foreground">{zone}</code> for you.
            </>
          )}
        </span>
      </div>

      <div
        role="table"
        aria-label={`DNS records for ${domain}`}
        className="overflow-hidden rounded-xl border border-border bg-card"
      >
        <div
          role="row"
          className={cn(
            "hidden gap-x-3 border-b border-border bg-muted/50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground @2xl:grid",
            COLUMNS
          )}
        >
          <span role="columnheader">Type</span>
          <span role="columnheader" className="pl-2">
            Host
          </span>
          <span role="columnheader" className="pl-2">
            Value
          </span>
          <span role="columnheader">Status</span>
        </div>
        {groups.map(({ group, records: rows }, index) => (
          <div
            key={group.id}
            role="rowgroup"
            className={cn(index > 0 && "border-t border-border")}
          >
            <div role="row" className="px-3 pb-0.5 pt-2.5">
              <span
                role="cell"
                className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground"
              >
                <b className="font-semibold text-foreground">{group.title}</b>
                {group.why}
              </span>
            </div>
            {rows.map((record, i) => (
              <RecordRow
                key={record.id}
                record={record}
                zone={zone}
                full={full}
                checked={checked}
                first={i === 0}
              />
            ))}
          </div>
        ))}
      </div>

      {hasSpf ? (
        <p className="text-xs leading-5 text-muted-foreground">
          A host can hold only one SPF record. If yours already has one, merge
          this value into it instead of adding a second.
        </p>
      ) : null}
    </div>
  );
}
