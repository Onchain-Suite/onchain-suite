"use client";

import {
  Alert02Icon,
  ArrowDown01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import {
  senderDomainDnsKey,
  senderDomainsKey,
} from "../../hooks/use-sender-domains";
import { useZoneOf } from "../../hooks/use-zone-of";
import {
  ago,
  dnsProgress,
  progressPercent,
  provisionedRecords,
} from "../../utils/dns-view";
import { parseDomainDns } from "../../utils/domain-dns";
import {
  normalizeDomainStatus,
  type SenderDomain,
} from "../../utils/domain-status";
import {
  isTimeoutError,
  RECHECK_TIMEOUT_MESSAGE,
} from "../../utils/recheck-error";
import { DeleteDomainButton } from "./delete-domain-button";
import { DnsRecordsTable } from "./dns-records-table";
import { DomainFileActions } from "./domain-file-actions";
import { senderIdentitiesService } from "@/features/settings/sender-identities.service";
import { Icon } from "@/shared/components/common/hugeicon";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

const STATUS: Record<SenderDomain["status"], { label: string; cls: string }> = {
  verified: {
    label: "Verified",
    cls: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
  },
  pending: {
    label: "Waiting on DNS",
    cls: "border-amber-500/40 text-amber-600 dark:text-amber-400",
  },
  failed: { label: "Failed", cls: "border-destructive/40 text-destructive" },
};

/** The time, re-read every few seconds while `on`, so "checked 2 min ago" stays true. */
function useNow(on: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    const tick = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(tick);
  }, [on]);
  return now;
}

/**
 * One sending domain: its name, how many of its records have been found, and
 * the records themselves. Branded email cannot send until every record
 * resolves, so this is the gate. A verified domain keeps its records folded
 * away; one still waiting shows them, because adding them is the whole job.
 */
export function SenderDomainPanel({
  domain,
  organizationId,
  orgName,
}: {
  domain: SenderDomain;
  organizationId: string | null;
  /** Leads the exported CSV's filename. */
  orgName?: string;
}) {
  const queryClient = useQueryClient();
  const verified = domain.status === "verified";
  const [showRecords, setShowRecords] = useState(false);
  const [full, setFull] = useState(false);
  const open = !verified || showRecords;
  const orgId = organizationId ?? undefined;

  const dnsQuery = useQuery({
    queryKey: senderDomainDnsKey(domain.id),
    enabled: open && Boolean(organizationId),
    retry: false,
    queryFn: async () =>
      parseDomainDns(
        await senderIdentitiesService.getDomainDns(domain.id, orgId)
      ),
  });

  // Idempotent, so it is safe to run when the records are first shown; cached
  // so coming back to the tab does not provision again.
  const provisionQuery = useQuery({
    queryKey: ["channels", "sender-domain-provision", domain.id],
    enabled: open && !verified && Boolean(organizationId),
    retry: false,
    staleTime: 5 * 60 * 1000,
    queryFn: () => senderIdentitiesService.provisionDomain(domain.id, orgId),
  });

  const dns = dnsQuery.data;
  const hasReport = Boolean(dns && dns.records.length > 0);
  const records = useMemo(
    () =>
      dns && dns.records.length > 0
        ? dns.records
        : provisionedRecords(provisionQuery.data),
    [dns, provisionQuery.data]
  );
  const progress = useMemo(() => dnsProgress(records), [records]);
  // Null until the public suffix list has loaded: whole names until then.
  const zone = useZoneOf(domain.domain);
  const loading =
    dnsQuery.isLoading || (!hasReport && provisionQuery.isLoading);
  const now = useNow(!verified && dnsQuery.dataUpdatedAt > 0);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: senderDomainsKey(organizationId),
      }),
      queryClient.invalidateQueries({
        queryKey: senderDomainDnsKey(domain.id),
      }),
    ]);

  const recheck = useMutation({
    mutationFn: () => senderIdentitiesService.recheckDomain(domain.id, orgId),
    onSuccess: async (result) => {
      await refresh();
      if (normalizeDomainStatus(result?.status) === "verified") {
        toast.success(`${domain.domain} verified. Email can send.`);
      }
    },
    onError: async (error: unknown) => {
      // A slow provider check can outlast the request. It very likely keeps
      // running server-side, so refresh and say it is in progress instead of
      // surfacing a raw timeout as a failure.
      if (isTimeoutError(error)) {
        await refresh();
        toast.message(RECHECK_TIMEOUT_MESSAGE);
        return;
      }
      toast.error(
        error instanceof Error ? error.message : "Couldn't check the domain"
      );
    },
  });

  const remove = useMutation({
    mutationFn: () => senderIdentitiesService.deleteDomain(domain.id, orgId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: senderDomainsKey(organizationId),
      });
      toast.success(
        verified
          ? "Domain removed. Branded email can no longer send from it."
          : "Domain removed"
      );
    },
    onError: (error: unknown) =>
      toast.error(
        error instanceof Error ? error.message : "Couldn't remove the domain"
      ),
  });

  const summary = verified ? (
    <>
      {hasReport ? `All ${String(progress.total)} records found. ` : null}
      Email sends from <b className="text-foreground">{domain.domain}</b>.
    </>
  ) : loading ? null : records.length === 0 ? (
    "No records to add yet. Check again in a moment."
  ) : !hasReport || progress.unchecked ? (
    <>
      Add these {progress.total} records at your DNS provider, or import them
      all at once as a zone file.
    </>
  ) : (
    <>
      <b className="text-foreground">
        {progress.found} of {progress.total}
      </b>{" "}
      found.{" "}
      {progress.left > 0 ? `${String(progress.left)} still to fix.` : null}
    </>
  );

  return (
    <section
      className="space-y-3"
      aria-label={`Sending domain ${domain.domain}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <code className="truncate font-mono text-sm font-semibold text-foreground">
            {domain.domain}
          </code>
          <Badge variant="outline" className={STATUS[domain.status].cls}>
            {STATUS[domain.status].label}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {open && records.length > 0 ? (
            <DomainFileActions
              domain={domain.domain}
              records={records}
              orgName={orgName}
            />
          ) : null}
          <DeleteDomainButton
            domain={domain.domain}
            status={domain.status}
            pending={remove.isPending}
            onConfirm={() => remove.mutate()}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div
          role="progressbar"
          aria-label="DNS records found"
          aria-valuemin={0}
          aria-valuemax={verified ? 1 : progress.total}
          aria-valuenow={verified ? 1 : progress.found}
          className="h-1 overflow-hidden rounded-full bg-muted"
        >
          <span
            className="block h-full rounded-full bg-emerald-500 transition-[width] duration-300"
            style={{
              width: `${String(verified ? 100 : progressPercent(progress))}%`,
            }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {loading && !verified ? (
            <Skeleton className="h-5 w-72 max-w-full" />
          ) : (
            <p role="status" className="text-sm text-muted-foreground">
              {summary}
            </p>
          )}
          {verified ? (
            <button
              type="button"
              aria-expanded={showRecords}
              onClick={() => setShowRecords((v) => !v)}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary"
            >
              {showRecords ? "Hide records" : "Show records"}
              <Icon
                icon={ArrowDown01Icon}
                className={cn(
                  "size-4 transition-transform",
                  showRecords && "rotate-180"
                )}
              />
            </button>
          ) : (
            <span className="inline-flex items-center gap-2.5 text-xs text-muted-foreground">
              {recheck.isPending
                ? "Checking DNS…"
                : dnsQuery.dataUpdatedAt > 0
                  ? `Checked ${ago(now - dnsQuery.dataUpdatedAt)}`
                  : null}
              <Button
                variant="outline"
                size="sm"
                disabled={recheck.isPending}
                onClick={() => recheck.mutate()}
              >
                <Icon
                  icon={RefreshIcon}
                  className={cn(
                    "size-3.5",
                    recheck.isPending && "animate-spin"
                  )}
                />
                Check now
              </Button>
            </span>
          )}
        </div>
      </div>

      {!verified && progress.conflicts > 0 ? (
        <div className="flex gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-3">
          <Icon
            icon={Alert02Icon}
            className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
          />
          <p className="text-sm leading-6 text-muted-foreground">
            <b className="text-foreground">
              {progress.conflicts === 1
                ? "1 record is blocked"
                : `${String(progress.conflicts)} records are blocked`}{" "}
              by something already in your DNS.
            </b>{" "}
            The fix is under each one marked below.
          </p>
        </div>
      ) : null}

      {!verified && dns && dns.fixes.length > 0 ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-3">
          <div className="text-sm font-medium text-foreground">
            How to fix your DNS
          </div>
          <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs leading-5 text-foreground">
            {dns.fixes.map((fix) => (
              <li key={fix}>{fix}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {open ? (
        loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ) : dnsQuery.isError && records.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3">
            <p className="text-sm text-muted-foreground">
              Couldn&apos;t load the records for this domain.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => dnsQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : records.length > 0 ? (
          <DnsRecordsTable
            domain={domain.domain}
            records={records}
            zone={zone}
            full={full}
            onFullChange={setFull}
            checked={hasReport && !progress.unchecked}
          />
        ) : null
      ) : null}
    </section>
  );
}
