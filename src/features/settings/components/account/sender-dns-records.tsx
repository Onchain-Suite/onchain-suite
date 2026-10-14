"use client";

import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import {
  buildDnsCsv,
  dnsCsvFilename,
  type DnsCsvRecord,
} from "../../utils/dns-records-csv";
import { StatusPill } from "../settings-card";
import { ConflictBox, CurrentInDns, DnsField } from "./dns-record-parts";
import {
  type DnsRecordRow,
  dnsRecordStage,
  type DomainDnsData,
} from "./domain-dns";
import type { DomainProvisionResult } from "@/features/settings/sender-identities.service";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

// SES is the only surfaced provider - transactional (ACS) and SendGrid records
// are hidden, so customers publish exactly one set of DNS records.
const HIDDEN_PROVIDERS = new Set(["sendgrid", "acs"]);
const PROVIDER_META: Record<string, string> = {
  acs: "Azure ACS",
  ses: "Amazon SES",
};
const providerName = (provider: string) =>
  PROVIDER_META[provider.toLowerCase()] ?? provider ?? "Provider";
const providerOrder = (provider: string) =>
  provider.toLowerCase() === "ses"
    ? 0
    : provider.toLowerCase() === "acs"
      ? 1
      : 2;

/** A record needs a fix only when it conflicts AND the conflict is not purely
 *  informational. Those are the only rows shown expanded with recommendations. */
const needsFix = (r: DnsRecordRow) =>
  Boolean(r.conflict && !r.conflict.informational);

export function SenderDnsRecords({
  dnsLoading,
  dns,
  provisionLoading,
  provision,
  onRecheck,
  rechecking,
  orgName,
  domain,
}: {
  dnsLoading: boolean;
  dns: DomainDnsData | undefined;
  provisionLoading: boolean;
  provision: DomainProvisionResult | undefined;
  onRecheck: () => void;
  rechecking: boolean;
  /** Organisation name - leads the exported CSV's filename. */
  orgName?: string;
  /** The sender domain these records belong to. */
  domain?: string;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Flatten whatever records are on screen into the three CSV columns a DNS
  // admin needs. Prefer the verification records (with their recommended
  // values); fall back to the provision records for a freshly-added domain.
  const exportRecords = useMemo<DnsCsvRecord[]>(() => {
    if (dns && dns.records.length > 0) {
      return dns.records.map((r) => ({
        type: r.type,
        name: r.fqdn ?? r.host,
        value: r.recommended ?? r.value,
      }));
    }
    return (provision?.providers ?? [])
      .filter((p) => !HIDDEN_PROVIDERS.has(p.provider.toLowerCase()))
      .flatMap((p) =>
        p.records.map((r) => ({ type: r.type, name: r.host, value: r.value }))
      );
  }, [dns, provision]);

  const handleExportCsv = useCallback(() => {
    if (exportRecords.length === 0 || typeof document === "undefined") return;
    const csv = buildDnsCsv(exportRecords);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = dnsCsvFilename(orgName, domain);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [exportRecords, orgName, domain]);

  if (dnsLoading || !dns) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    );
  }

  const { records } = dns;
  const conflicts = records.filter(needsFix);
  const others = records.filter((r) => !needsFix(r));
  const hasStatus =
    dns.sendReady !== undefined || dns.verificationStates.length > 0;

  return (
    <div className="space-y-4">
      {hasStatus ? (
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={dns.sendReady ? "success" : "pending"}>
            {dns.sendReady ? "Send-ready" : "Verification pending"}
          </StatusPill>
          {dns.verificationStates.map(({ check, state }) => (
            <span
              key={check}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                state.toLowerCase() === "verified"
                  ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : state.toLowerCase() === "verificationfailed"
                    ? "border-destructive/40 text-destructive"
                    : "border-border text-muted-foreground"
              )}
            >
              <span className="font-medium uppercase">{check}</span>
              {state.replace(/^Verification/, "")}
            </span>
          ))}
        </div>
      ) : null}

      {conflicts.length > 0 ? (
        <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
          {conflicts.length} existing record{conflicts.length === 1 ? "" : "s"}{" "}
          conflict{conflicts.length === 1 ? "s" : ""} with verification, apply
          the fixes below.
        </p>
      ) : null}

      {dns.fixes.length > 0 ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
          <div className="text-xs font-medium text-foreground">
            How to fix your DNS
          </div>
          <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs leading-5 text-foreground">
            {dns.fixes.map((fix) => (
              <li key={fix}>{fix}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {records.length === 0 ? (
        <ProvisionFallback
          loading={provisionLoading}
          data={provision}
          openIds={openIds}
          onToggle={toggle}
        />
      ) : (
        <div className="space-y-3">
          {conflicts.map((record) => (
            <ConflictRecord key={record.id} record={record} />
          ))}

          {others.length > 0 ? (
            <div className="space-y-1.5">
              {conflicts.length > 0 ? (
                <div className="pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Other records to publish
                </div>
              ) : null}
              {others.map((record) => (
                <CompactRecord
                  key={record.id}
                  record={record}
                  open={openIds.has(record.id)}
                  onToggle={() => toggle(record.id)}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRecheck}
          disabled={rechecking}
        >
          <ArrowPathIcon
            aria-hidden="true"
            className={cn("mr-1.5 h-4 w-4", rechecking && "animate-spin")}
          />
          Recheck domain
        </Button>
        {exportRecords.length > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            title="Download these records as a CSV to send to whoever manages your DNS"
          >
            <ArrowDownTrayIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** Conflicting record: always expanded, with the recommended value and the
 *  edit instructions the user has to apply. */
function ConflictRecord({ record }: { record: DnsRecordRow }) {
  const stage = dnsRecordStage(record);
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {record.type}
        </span>
        <StatusPill tone={stage.tone}>{stage.label}</StatusPill>
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{stage.hint}</p>

      <div className="mt-2 space-y-2">
        <DnsField label="Name" value={record.fqdn ?? record.host} />
        <CurrentInDns current={record.current} />
        <DnsField
          label={
            record.recommended !== undefined || record.current !== undefined
              ? "Recommended value"
              : "Value"
          }
          value={record.recommended ?? record.value}
        />
      </div>

      {record.conflict ? <ConflictBox conflict={record.conflict} /> : null}
    </div>
  );
}

/** Non-conflicting record: a compact row, expandable to reveal host + value. */
function CompactRecord({
  record,
  open,
  onToggle,
}: {
  record: DnsRecordRow;
  open: boolean;
  onToggle: () => void;
}) {
  const stage = dnsRecordStage(record);
  return (
    <div className="rounded-lg border border-border/60 bg-background/60">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-2 text-left"
      >
        <span className="w-12 shrink-0 text-[11px] uppercase tracking-wider text-muted-foreground">
          {record.type}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-xs text-foreground">
            {record.fqdn ?? record.host}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {stage.hint}
          </span>
        </span>
        <StatusPill tone={stage.tone}>{stage.label}</StatusPill>
        <ChevronDownIcon
          aria-hidden="true"
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? (
        <div className="space-y-2 border-t border-border/50 px-3 py-3">
          <DnsField label="Name" value={record.fqdn ?? record.host} />
          <CurrentInDns current={record.current} />
          <DnsField
            label={
              record.recommended !== undefined || record.current !== undefined
                ? "Recommended value"
                : "Value"
            }
            value={record.recommended ?? record.value}
          />
          {record.conflict?.informational ? (
            <ConflictBox conflict={record.conflict} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Publish-only fallback: shown before verification data exists for a fresh
 *  domain. Records come from the provision endpoint (no live DNS context). */
function ProvisionFallback({
  loading,
  data,
  openIds,
  onToggle,
}: {
  loading: boolean;
  data: DomainProvisionResult | undefined;
  openIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (loading) {
    return <Skeleton className="h-24 w-full rounded-lg" />;
  }
  const shown = (data?.providers ?? [])
    .filter((p) => !HIDDEN_PROVIDERS.has(p.provider.toLowerCase()))
    .sort((a, b) => providerOrder(a.provider) - providerOrder(b.provider));
  if (shown.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        DNS records are not available yet for this domain.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-medium text-foreground">
          DNS records to publish
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Publish every record below to verify your sending domain.
        </p>
      </div>
      {shown.map((prov) => {
        const unavailable =
          prov.status === "skipped" || prov.status === "error";
        return (
          <div key={prov.provider} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground">
                {providerName(prov.provider)}
              </span>
              {prov.status === "skipped" ? (
                <StatusPill tone="pending">Not configured</StatusPill>
              ) : prov.status === "error" ? (
                <StatusPill tone="danger">Error</StatusPill>
              ) : null}
            </div>
            {unavailable ? (
              <p className="text-xs text-muted-foreground">
                {prov.reason ??
                  (prov.status === "skipped"
                    ? "This provider isn't configured yet - no records to publish."
                    : "Couldn't fetch records for this provider.")}
              </p>
            ) : prov.records.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No records returned yet.
              </p>
            ) : (
              prov.records.map((r) => {
                const id = `${prov.provider}-${r.type}-${r.host}`;
                return (
                  <CompactRecord
                    key={id}
                    record={{
                      id,
                      host: r.host,
                      type: r.type,
                      value: r.value,
                      verified: r.valid === true ? true : undefined,
                      verificationLabel:
                        r.valid === false ? "Not started" : undefined,
                    }}
                    open={openIds.has(id)}
                    onToggle={() => onToggle(id)}
                  />
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}
