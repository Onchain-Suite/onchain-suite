"use client";

import {
  ArrowPathIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CopyButton } from "@/components/common/copy-button";

import { apiClient } from "@/lib/api-client";
import { cn, isJsonObject } from "@/lib/utils";

import { SettingsCard, SettingsStepper, StatusPill } from "../settings-card";
import { parseDomainDns } from "./domain-dns";
import { useAccountOrg } from "./use-account-org";
import {
  type DomainProvisionResult,
  type SenderDomainRecord,
  senderIdentitiesService,
} from "@/features/settings/sender-identities.service";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";

const STEPS = ["Add DNS records", "We check", "Verified"];

type DomainStatus = "verified" | "pending" | "failed";

function normalizeStatus(raw: unknown): DomainStatus {
  const s = typeof raw === "string" ? raw.toLowerCase() : "";
  if (s.includes("verif") && !s.includes("pending")) return "verified";
  if (s.includes("fail")) return "failed";
  return "pending";
}

function cleanDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

interface DomainRow {
  id: string;
  domain: string;
  status: DomainStatus;
}

const domainsKey = (orgId: string | null) =>
  ["account", "domains", orgId] as const;

export function SenderVerificationCard() {
  const { organizationId, orgHeaders } = useAccountOrg();
  const queryClient = useQueryClient();
  const [domainInput, setDomainInput] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const domainsQuery = useQuery({
    queryKey: domainsKey(organizationId),
    enabled: Boolean(organizationId),
    retry: false,
    queryFn: async () => {
      const rows = await senderIdentitiesService.listDomains(
        organizationId ?? undefined
      );
      return rows
        .map((row: SenderDomainRecord): DomainRow | null => {
          const domain =
            typeof row.domain === "string" ? row.domain : undefined;
          if (!domain) return null;
          return {
            id: typeof row.id === "string" ? row.id : domain,
            domain,
            status: normalizeStatus(row.status),
          };
        })
        .filter((r): r is DomainRow => r !== null);
    },
  });

  const domains = useMemo(() => domainsQuery.data ?? [], [domainsQuery.data]);
  const currentStep = useMemo(() => {
    if (domains.length === 0) return 0;
    if (domains.every((d) => d.status === "verified")) return 2;
    return 1;
  }, [domains]);

  const dnsQuery = useQuery({
    queryKey: ["account", "domain-dns", expandedId],
    enabled: Boolean(expandedId && orgHeaders),
    retry: false,
    queryFn: async () => {
      const res = await apiClient.get(`/domain/${expandedId}/dns`, {
        headers: orgHeaders,
      });
      return parseDomainDns(res.data);
    },
  });

  // Both providers at once (transactional + marketing), so the customer can
  // publish every DNS record - not just the routed provider's. Idempotent, so
  // it's safe to run on expand; cached to avoid re-provisioning on focus.
  const provisionQuery = useQuery({
    queryKey: ["account", "domain-provision", expandedId],
    enabled: Boolean(expandedId && orgHeaders),
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: () =>
      senderIdentitiesService.provisionDomain(
        expandedId as string,
        organizationId ?? undefined
      ),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const domain = cleanDomain(domainInput);
      if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
        throw new Error("Enter a valid domain, e.g. mail.yourdomain.com");
      }
      return senderIdentitiesService.createDomain(
        domain,
        organizationId ?? undefined
      );
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: domainsKey(organizationId),
      });
      const record = isJsonObject(result) ? result : {};
      const id = typeof record.id === "string" ? record.id : undefined;
      setDomainInput("");
      if (id) setExpandedId(id);
      toast.success("Domain added - publish the DNS records to verify");
    },
    onError: (error: unknown) =>
      toast.error(
        error instanceof Error ? error.message : "Failed to add domain"
      ),
  });

  const recheckMutation = useMutation({
    mutationFn: (domainId: string) =>
      senderIdentitiesService.recheckDomain(
        domainId,
        organizationId ?? undefined
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: domainsKey(organizationId) }),
        queryClient.invalidateQueries({ queryKey: ["account", "domain-dns"] }),
      ]);
      toast.success("Recheck started");
    },
    onError: (error: unknown) =>
      toast.error(
        error instanceof Error ? error.message : "Failed to recheck domain"
      ),
  });

  // Lets the user clear out a domain that's stuck pending/failed so it doesn't
  // linger in the list forever.
  const deleteMutation = useMutation({
    mutationFn: (domainId: string) =>
      senderIdentitiesService.deleteDomain(
        domainId,
        organizationId ?? undefined
      ),
    onSuccess: async (_res, domainId) => {
      if (expandedId === domainId) setExpandedId(null);
      await queryClient.invalidateQueries({
        queryKey: domainsKey(organizationId),
      });
      toast.success("Domain removed");
    },
    onError: (error: unknown) =>
      toast.error(
        error instanceof Error ? error.message : "Failed to remove domain"
      ),
  });

  return (
    <SettingsCard
      title="Sender verification"
      description="Domains, DKIM and SPF for branded sending"
    >
      <SettingsStepper steps={STEPS} current={currentStep} />

      <form
        className="mt-6 flex max-w-xl flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          createMutation.mutate();
        }}
      >
        <div className="min-w-56 flex-1 space-y-2">
          <label
            htmlFor="sending-domain"
            className="text-sm font-medium text-foreground"
          >
            Sending domain
          </label>
          <Input
            id="sending-domain"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            placeholder="mail.yourdomain.com"
          />
        </div>
        <Button
          type="submit"
          disabled={createMutation.isPending || !organizationId}
        >
          {createMutation.isPending ? "Generating…" : "Generate DNS records"}
        </Button>
      </form>

      {domains.length > 0 ? (
        <div className="mt-6 space-y-2 border-t border-border/50 pt-4">
          {domains.map((domain) => {
            const open = expandedId === domain.id;
            return (
              <div
                key={domain.id}
                className="rounded-xl border border-border/60 bg-background/40"
              >
                <div className="flex items-center gap-1 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : domain.id)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                  >
                    <span className="truncate font-mono text-sm text-foreground">
                      {domain.domain}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <StatusPill
                        tone={
                          domain.status === "verified"
                            ? "success"
                            : domain.status === "failed"
                              ? "danger"
                              : "pending"
                        }
                      >
                        {domain.status === "verified"
                          ? "Verified"
                          : domain.status === "failed"
                            ? "Failed"
                            : "Pending"}
                      </StatusPill>
                      <ChevronDownIcon
                        aria-hidden="true"
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          open && "rotate-180"
                        )}
                      />
                    </span>
                  </button>
                  {domain.status !== "verified" ? (
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(domain.id)}
                      disabled={
                        deleteMutation.isPending &&
                        deleteMutation.variables === domain.id
                      }
                      aria-label={`Remove ${domain.domain}`}
                      title="Remove domain"
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    >
                      <TrashIcon aria-hidden="true" className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                {open ? (
                  <div className="border-t border-border/50 px-4 py-4">
                    {domain.status === "verified" ? (
                      <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
                        <CheckCircleIcon
                          aria-hidden="true"
                          className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                        />
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-foreground">
                            Verified - sending is live
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Domain authentication passed for this domain. There
                            are no DNS records left to publish.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <AllProviderDnsRecords
                          loading={provisionQuery.isLoading}
                          data={provisionQuery.data}
                        />
                        <DomainDnsPanel
                          loading={dnsQuery.isLoading}
                          data={dnsQuery.data}
                          onRecheck={() => recheckMutation.mutate(domain.id)}
                          rechecking={recheckMutation.isPending}
                        />
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </SettingsCard>
  );
}

// Friendly display name per send provider. SES leads; SendGrid/ACS are hidden.
const PROVIDER_META: Record<string, string> = {
  acs: "Azure ACS",
  ses: "Amazon SES",
};
const providerName = (provider: string) =>
  PROVIDER_META[provider.toLowerCase()] ?? provider ?? "Provider";

// SES is the only surfaced provider - transactional (ACS) and SendGrid records
// are hidden, so customers publish exactly one set of DNS records.
const HIDDEN_PROVIDERS = new Set(["sendgrid", "acs"]);
const providerOrder = (provider: string) => {
  const p = provider.toLowerCase();
  if (p === "ses") return 0;
  if (p === "acs") return 1;
  return 2;
};

/**
 * All configured providers' DNS records together (from POST /domain/{id}/provision)
 * so the customer can publish both the transactional and marketing record sets,
 * not just the routed provider's. Skipped/error providers show their reason.
 */
function AllProviderDnsRecords({
  loading,
  data,
}: {
  loading: boolean;
  data: DomainProvisionResult | undefined;
}) {
  if (loading) {
    return <Skeleton className="mb-5 h-24 w-full rounded-lg" />;
  }
  // Drop SendGrid entirely and lead with SES (the default DNS provider).
  const shown = (data?.providers ?? [])
    .filter((p) => !HIDDEN_PROVIDERS.has(p.provider.toLowerCase()))
    .sort((a, b) => providerOrder(a.provider) - providerOrder(b.provider));
  if (shown.length === 0) return null;

  return (
    <div className="mb-5 space-y-3">
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
          <div
            key={prov.provider}
            className="rounded-lg border border-border/60 bg-background/60 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">
                {providerName(prov.provider)}
              </span>
              {prov.status === "skipped" ? (
                <StatusPill tone="pending">Not configured</StatusPill>
              ) : prov.status === "error" ? (
                <StatusPill tone="danger">Error</StatusPill>
              ) : null}
            </div>
            {unavailable ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {prov.reason ??
                  (prov.status === "skipped"
                    ? "This provider isn't configured yet - no records to publish."
                    : "Couldn't fetch records for this provider.")}
              </p>
            ) : prov.records.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                No records returned yet.
              </p>
            ) : (
              <div className="mt-2 space-y-3">
                {prov.records.map((r) => (
                  <div key={`${r.type}-${r.host}`} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        {r.type}
                      </span>
                      {r.valid === true ? (
                        <StatusPill tone="success">Pass</StatusPill>
                      ) : r.valid === false ? (
                        <StatusPill tone="pending">Pending</StatusPill>
                      ) : null}
                    </div>
                    <DnsField label="Host" value={r.host} />
                    <DnsField label="Value" value={r.value} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DomainDnsPanel({
  loading,
  data,
  onRecheck,
  rechecking,
}: {
  loading: boolean;
  data: ReturnType<typeof parseDomainDns> | undefined;
  onRecheck: () => void;
  rechecking: boolean;
}) {
  if (loading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    );
  }

  const conflictCount = data.records.filter(
    (r) => r.conflict && !r.conflict.informational
  ).length;

  return (
    <div className="space-y-4">
      {data.sendReady !== undefined || data.verificationStates.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={data.sendReady ? "success" : "pending"}>
            {data.sendReady ? "Send-ready" : "Verification pending"}
          </StatusPill>
          {data.verificationStates.map(({ check, state }) => (
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

      {conflictCount > 0 ? (
        <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
          {conflictCount} existing record{conflictCount === 1 ? "" : "s"}{" "}
          conflict{conflictCount === 1 ? "s" : ""} with verification, apply the
          fixes below.
        </p>
      ) : null}

      {data.fixes.length > 0 ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
          <div className="text-xs font-medium text-foreground">
            How to fix your DNS
          </div>
          <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs leading-5 text-foreground">
            {data.fixes.map((fix) => (
              <li key={fix}>{fix}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {data.records.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          DNS records are not available yet for this domain.
        </p>
      ) : (
        <div className="space-y-3">
          {data.records.map((record) => (
            <div
              key={record.id}
              className="rounded-lg border border-border/60 bg-background/60 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {record.type}
                </span>
                {record.verified === true ? (
                  <StatusPill tone="success">Pass</StatusPill>
                ) : record.verified === false ? (
                  <StatusPill tone="danger">Fail</StatusPill>
                ) : record.verificationLabel ? (
                  <StatusPill tone="pending">
                    {record.verificationLabel}
                  </StatusPill>
                ) : null}
              </div>

              <div className="mt-2 space-y-2">
                <DnsField label="Host" value={record.host} />
                {record.current !== undefined ? (
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Current in your DNS
                    </div>
                    {record.current.length === 0 ? (
                      <div className="mt-1 rounded-md border border-dashed border-border/70 px-2 py-1 text-xs italic text-muted-foreground">
                        Nothing published yet
                      </div>
                    ) : (
                      <div className="mt-1 space-y-1">
                        {record.current.map((live) => (
                          <code
                            key={live}
                            className="block break-all rounded-md bg-muted/60 px-2 py-1 text-xs text-muted-foreground"
                          >
                            {live}
                          </code>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
                <DnsField
                  label={
                    record.recommended !== undefined ||
                    record.current !== undefined
                      ? "Recommended value"
                      : "Value"
                  }
                  value={record.recommended ?? record.value}
                />
              </div>

              {record.conflict ? (
                <div
                  className={cn(
                    "mt-2 rounded-lg border p-2.5 text-xs leading-5",
                    record.conflict.informational
                      ? "border-border/70 bg-muted/30 text-muted-foreground"
                      : "border-amber-500/40 bg-amber-500/10 text-foreground"
                  )}
                >
                  <div className="font-medium">
                    {record.conflict.informational
                      ? "Existing record found"
                      : "Conflicting record - update it"}
                  </div>
                  {record.conflict.reason ? (
                    <p className="mt-1 text-muted-foreground">
                      {record.conflict.reason}
                    </p>
                  ) : null}
                  {record.conflict.actions.map((action) => (
                    <div
                      key={[action.action, action.host, action.newValue]
                        .filter(Boolean)
                        .join("|")}
                      className="mt-1.5 flex flex-wrap items-center gap-1.5"
                    >
                      <span className="inline-flex rounded-full border border-border/70 bg-background/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase">
                        {action.action}
                      </span>
                      {action.currentValue ? (
                        <code className="break-all rounded bg-muted px-1.5 py-0.5 text-[11px] line-through opacity-70">
                          {action.currentValue}
                        </code>
                      ) : null}
                      {action.newValue ? (
                        <span className="flex items-center gap-1">
                          <code className="break-all rounded bg-muted px-1.5 py-0.5 text-[11px]">
                            {action.newValue}
                          </code>
                          <CopyButton value={action.newValue} label="Copy" />
                        </span>
                      ) : null}
                    </div>
                  ))}
                  {record.conflict.actions.length === 0 &&
                  record.conflict.resolution ? (
                    <p className="mt-1">{record.conflict.resolution}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

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
    </div>
  );
}

function DnsField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-start gap-1.5">
        <code className="block min-w-0 flex-1 break-all rounded-md bg-muted px-2 py-1 text-xs text-foreground">
          {value}
        </code>
        <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} />
      </div>
    </div>
  );
}

export default SenderVerificationCard;
