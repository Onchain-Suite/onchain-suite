"use client";

import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { getSelectedOrganizationId } from "@/lib/utils";

import {
  type DomainProvider,
  type ProviderDnsRecord,
  senderIdentitiesService,
} from "@/features/settings/sender-identities.service";
import { CopyButton } from "@/shared/components/common/copy-button";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

/** A single copy-paste CNAME row: host → value. */
function RecordRow({ record }: { record: ProviderDnsRecord }) {
  const type = (record.type ?? "CNAME").toUpperCase();
  return (
    <div className="grid grid-cols-1 gap-2 rounded-xl border border-border/60 bg-background/60 p-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
      <span className="w-fit rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase text-muted-foreground">
        {type}
      </span>
      <div className="min-w-0 space-y-1.5">
        <Field label="Host" value={record.host} />
        <Field label="Value" value={record.value} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <code className="min-w-0 flex-1 truncate rounded-md bg-muted/60 px-2 py-1 font-mono text-xs text-foreground">
        {value}
      </code>
      <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} />
    </div>
  );
}

/**
 * Domain authentication: add a domain, provision it, publish the CNAME records
 * shown, then poll validation until the domain can send. The email/DNS provider
 * is a backend detail — every `authenticating` entry contributes its records,
 * `skipped` entries are hidden, and `error` entries surface their reason.
 */
export function DomainVerification({
  onVerified,
}: {
  onVerified?: (domain: string) => void;
}) {
  const orgId = getSelectedOrganizationId() ?? undefined;
  const [domainInput, setDomainInput] = useState("");
  const [domainId, setDomainId] = useState<string | null>(null);
  const [domainName, setDomainName] = useState("");
  const [providers, setProviders] = useState<DomainProvider[]>([]);
  const verifiedFiredRef = useRef(false);

  // Add (POST /domain) then provision (POST /domain/{id}/provision) in one go.
  const provision = useMutation({
    mutationFn: async (domain: string) => {
      const created = await senderIdentitiesService.addSendingDomain(
        { domain },
        orgId
      );
      const id =
        typeof created.id === "string" && created.id.length > 0
          ? created.id
          : "";
      if (!id) throw new Error("The domain was created without an id.");
      const provisioned = await senderIdentitiesService.provisionDomain(
        id,
        orgId
      );
      return {
        id,
        domain: (created.domain as string | undefined) ?? domain,
        providers: provisioned.providers ?? [],
      };
    },
    onSuccess: (result) => {
      setDomainId(result.id);
      setDomainName(result.domain);
      setProviders(result.providers);
    },
  });

  // Poll validation until the domain is valid.
  const validation = useQuery({
    queryKey: ["domain", "validate", domainId],
    enabled: Boolean(domainId),
    queryFn: () =>
      senderIdentitiesService.validateDomain(domainId as string, orgId),
    refetchInterval: (query) => (query.state.data?.valid ? false : 8000),
    refetchOnWindowFocus: false,
    retry: false,
  });

  const isValid = validation.data?.valid === true;

  useEffect(() => {
    if (isValid && !verifiedFiredRef.current) {
      verifiedFiredRef.current = true;
      onVerified?.(domainName);
    }
  }, [isValid, domainName, onVerified]);

  // Records from every authenticating entry render as one list; skipped ones
  // hide. The concrete provider is never surfaced.
  const records = providers
    .filter((p) => p.status === "authenticating")
    .flatMap((p) => p.records ?? []);
  const errored = providers.filter((p) => p.status === "error");

  if (!domainId) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const domain = domainInput.trim().toLowerCase();
          if (domain.length > 0) provision.mutate(domain);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <Input
          value={domainInput}
          onChange={(e) => setDomainInput(e.target.value)}
          placeholder="yourdomain.com"
          aria-label="Domain to verify"
          className="sm:flex-1"
          autoComplete="off"
          spellCheck={false}
        />
        <Button
          type="submit"
          disabled={provision.isPending || domainInput.trim().length === 0}
          className="rounded-xl"
        >
          {provision.isPending ? "Adding…" : "Add & verify"}
        </Button>
        {provision.isError ? (
          <p className="text-xs text-destructive sm:basis-full">
            {provision.error instanceof Error
              ? provision.error.message
              : "Could not add the domain."}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-foreground">{domainName}</div>
        {isValid ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
            Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <ArrowPathIcon
              className={`h-3.5 w-3.5 ${validation.isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Waiting for DNS
          </span>
        )}
      </div>

      {isValid ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-foreground">
          DNS verified — <span className="font-medium">{domainName}</span> can
          now send email.
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Add these records at your DNS provider. They verify automatically
            once they propagate — this can take a few minutes.
          </p>

          {errored.map((entry) => (
            <div
              key={`err-${entry.provider}`}
              className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              <ExclamationTriangleIcon
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span>{entry.reason ?? "Provisioning failed."}</span>
            </div>
          ))}

          {records.length > 0 ? (
            <div className="space-y-2">
              {records.map((record) => (
                <RecordRow
                  key={`${record.host}=${record.value}`}
                  record={record}
                />
              ))}
            </div>
          ) : null}

          {records.length === 0 && errored.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No records to publish yet — provisioning may still be in progress.
            </p>
          ) : null}

          <div className="flex items-center gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => validation.refetch()}
              disabled={validation.isFetching}
              className="rounded-xl"
            >
              <ArrowPathIcon
                className={`mr-2 h-4 w-4 ${validation.isFetching ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Check now
            </Button>
            <span className="text-xs text-muted-foreground">
              Re-checking automatically every few seconds.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
