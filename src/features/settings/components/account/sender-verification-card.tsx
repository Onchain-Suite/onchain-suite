"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CopyButton } from "@/components/common/copy-button";

import { isJsonObject } from "@/lib/utils";

import { SettingsCard, SettingsStepper, StatusPill } from "../settings-card";
import { useAccountOrg } from "./use-account-org";
import {
  type SenderDomainRecord,
  senderIdentitiesService,
} from "@/features/settings/sender-identities.service";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
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
  const { organizationId } = useAccountOrg();
  const queryClient = useQueryClient();
  const [domainInput, setDomainInput] = useState("");
  const [dnsDialog, setDnsDialog] = useState<{
    open: boolean;
    domainId: string | null;
    domain: string;
  }>({ open: false, domainId: null, domain: "" });

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

  // Step reflects overall posture: nothing added → 0, something pending → 1,
  // everything verified → 2.
  const currentStep = useMemo(() => {
    if (domains.length === 0) return 0;
    if (domains.every((d) => d.status === "verified")) return 2;
    return 1;
  }, [domains]);

  const dnsQuery = useQuery({
    queryKey: ["account", "domain-dns", dnsDialog.domainId],
    enabled: Boolean(dnsDialog.open && dnsDialog.domainId),
    retry: false,
    queryFn: async () => {
      const records = await senderIdentitiesService.getDomainDns(
        dnsDialog.domainId!,
        organizationId ?? undefined
      );
      return records;
    },
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
      const domain =
        typeof record.domain === "string"
          ? record.domain
          : cleanDomain(domainInput);
      setDomainInput("");
      if (id) setDnsDialog({ open: true, domainId: id, domain });
      toast.success("Domain added — publish the DNS records to verify");
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to add domain"
      );
    },
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

  const dnsRecords = dnsQuery.data ?? [];

  return (
    <SettingsCard
      title="Sender verification"
      description="Domains, DKIM and SPF for branded sending"
    >
      <SettingsStepper steps={STEPS} current={currentStep} />

      <div className="mt-6 max-w-xl space-y-2">
        <Label htmlFor="sending-domain">Sending domain</Label>
        <Input
          id="sending-domain"
          value={domainInput}
          onChange={(e) => setDomainInput(e.target.value)}
          placeholder="mail.vault77.com"
        />
        <p className="text-xs text-muted-foreground">
          Use a subdomain you control — sending from it keeps your root
          domain&apos;s reputation separate.
        </p>
      </div>
      <div className="mt-4">
        <Button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !organizationId}
        >
          {createMutation.isPending ? "Generating…" : "Generate DNS records"}
        </Button>
      </div>

      {domains.length > 0 ? (
        <ul className="mt-6 divide-y divide-border/50 border-t border-border/50 pt-2">
          {domains.map((domain) => (
            <li
              key={domain.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <span className="truncate font-mono text-sm text-foreground">
                {domain.domain}
              </span>
              <div className="flex shrink-0 items-center gap-2">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDnsDialog({
                      open: true,
                      domainId: domain.id,
                      domain: domain.domain,
                    })
                  }
                >
                  View DNS
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog
        open={dnsDialog.open}
        onOpenChange={(open) => setDnsDialog((d) => ({ ...d, open }))}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verify {dnsDialog.domain || "domain"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {dnsQuery.isLoading ? (
              <>
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </>
            ) : dnsRecords.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/70 bg-background/40 p-6 text-center text-sm text-muted-foreground">
                DNS records are not available yet for this domain.
              </p>
            ) : (
              dnsRecords.map((record, index) => {
                const host =
                  typeof record.host === "string" ? record.host : "@";
                const type =
                  typeof record.type === "string" ? record.type : "TXT";
                const value =
                  typeof record.value === "string" ? record.value : "";
                return (
                  <div
                    key={
                      typeof record.id === "string"
                        ? record.id
                        : `${host}-${index}`
                    }
                    className="rounded-xl border border-border/60 bg-background/40 p-4"
                  >
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      {type}
                    </div>
                    <div className="mt-2 space-y-2">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Host
                        </div>
                        <div className="mt-1 flex items-start gap-1.5">
                          <code className="block min-w-0 flex-1 break-all rounded-lg bg-muted px-2 py-1 text-xs">
                            {host}
                          </code>
                          <CopyButton value={host} label="Copy host" />
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Value
                        </div>
                        <div className="mt-1 flex items-start gap-1.5">
                          <code className="block min-w-0 flex-1 break-all rounded-lg bg-muted px-2 py-1 text-xs">
                            {value}
                          </code>
                          <CopyButton value={value} label="Copy value" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDnsDialog({ open: false, domainId: null, domain: "" })
              }
            >
              Close
            </Button>
            <Button
              onClick={() =>
                dnsDialog.domainId && recheckMutation.mutate(dnsDialog.domainId)
              }
              disabled={recheckMutation.isPending || !dnsDialog.domainId}
            >
              <ArrowPathIcon
                aria-hidden="true"
                className={`mr-1.5 h-4 w-4 ${recheckMutation.isPending ? "animate-spin" : ""}`}
              />
              Recheck domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsCard>
  );
}

export default SenderVerificationCard;
