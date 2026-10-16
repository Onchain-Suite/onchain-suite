"use client";

import { CheckCircleIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { cn, isJsonObject } from "@/lib/utils";

import { usePagination } from "../../hooks/use-pagination";
import {
  isTimeoutError,
  RECHECK_TIMEOUT_MESSAGE,
} from "../../utils/recheck-error";
import { ListPager } from "../list-pager";
import { SettingsCard, SettingsStepper, StatusPill } from "../settings-card";
import { DeleteDomainButton } from "./delete-domain-button";
import { parseDomainDns } from "./domain-dns";
import { type DomainStatus, normalizeDomainStatus } from "./domain-status";
import { SenderDnsRecords } from "./sender-dns-records";
import { useAccountOrg } from "./use-account-org";
import { useOrgSwitcherContextOptional } from "@/features/common/layout/components/org-switcher-context";
import {
  type SenderDomainRecord,
  senderIdentitiesService,
} from "@/features/settings/sender-identities.service";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

const STEPS = ["Add DNS records", "We check", "Verified"];

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

const DOMAINS_PER_PAGE = 5;

const domainsKey = (orgId: string | null) =>
  ["account", "domains", orgId] as const;

export function SenderVerificationCard() {
  const { organizationId, orgHeaders } = useAccountOrg();
  const activeOrg = useOrgSwitcherContextOptional()?.activeOrg;
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
            status: normalizeDomainStatus(row.status),
          };
        })
        .filter((r): r is DomainRow => r !== null);
    },
  });

  const domains = useMemo(() => domainsQuery.data ?? [], [domainsQuery.data]);
  const domainsPager = usePagination(domains, DOMAINS_PER_PAGE);
  const currentStep = useMemo(() => {
    if (domains.length === 0) return 0;
    // Past the last step so "Verified" renders as a completed check, not "3".
    if (domains.every((d) => d.status === "verified")) return STEPS.length;
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
    onError: async (error: unknown) => {
      // A slow provider check can outlast the request. It very likely keeps
      // running server-side, so refresh and frame it as in-progress rather
      // than surfacing a raw "timeout of Nms exceeded" as a failure.
      if (isTimeoutError(error)) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: domainsKey(organizationId),
          }),
          queryClient.invalidateQueries({
            queryKey: ["account", "domain-dns"],
          }),
        ]);
        toast.message(RECHECK_TIMEOUT_MESSAGE);
        return;
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to recheck domain"
      );
    },
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
          {domainsPager.items.map((domain) => {
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
                  <DeleteDomainButton
                    domain={domain.domain}
                    status={domain.status}
                    pending={
                      deleteMutation.isPending &&
                      deleteMutation.variables === domain.id
                    }
                    onConfirm={() => deleteMutation.mutate(domain.id)}
                  />
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
                            DNS authentication passed for this domain. There are
                            no DNS records left to publish.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <SenderDnsRecords
                        dnsLoading={dnsQuery.isLoading}
                        dns={dnsQuery.data}
                        provisionLoading={provisionQuery.isLoading}
                        provision={provisionQuery.data}
                        onRecheck={() => recheckMutation.mutate(domain.id)}
                        rechecking={recheckMutation.isPending}
                        orgName={activeOrg?.name ?? activeOrg?.slug}
                        domain={domain.domain}
                      />
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
          <ListPager pagination={domainsPager} label="domains" />
        </div>
      ) : null}
    </SettingsCard>
  );
}

export default SenderVerificationCard;
