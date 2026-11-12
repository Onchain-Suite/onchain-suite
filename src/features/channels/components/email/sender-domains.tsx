"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";

import {
  senderDomainsKey,
  useSenderDomains,
} from "../../hooks/use-sender-domains";
import { cleanDomain, isDomain } from "../../utils/dns-view";
import { SenderDomainPanel } from "./sender-domain-panel";
import { useOrgSwitcherContextOptional } from "@/features/common/layout/components/org-switcher-context";
import { ListPager } from "@/features/settings/components/list-pager";
import { usePagination } from "@/features/settings/hooks/use-pagination";
import { senderIdentitiesService } from "@/features/settings/sender-identities.service";
import { Icon } from "@/shared/components/common/hugeicon";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";

const DOMAINS_PER_PAGE = 5;

function AddDomainForm({
  organizationId,
  defaultDomain,
  onAdded,
}: {
  organizationId: string | null;
  defaultDomain: string;
  onAdded?: () => void;
}) {
  const inputId = useId();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(() => cleanDomain(defaultDomain));
  const domain = cleanDomain(draft);
  const valid = isDomain(domain);

  const create = useMutation({
    mutationFn: () =>
      senderIdentitiesService.createDomain(domain, organizationId ?? undefined),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: senderDomainsKey(organizationId),
      });
      setDraft("");
      toast.success("Records generated. Add them at your DNS provider.");
      onAdded?.();
    },
    onError: (error: unknown) =>
      toast.error(
        error instanceof Error ? error.message : "Couldn't add the domain"
      ),
  });

  return (
    <form
      className="flex max-w-xl flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !create.isPending) create.mutate();
      }}
    >
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-foreground"
        >
          Sending domain
        </label>
        <Input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="mail.acme.com"
          className="font-mono"
          autoComplete="off"
          spellCheck={false}
          aria-describedby={`${inputId}-help`}
        />
        <p id={`${inputId}-help`} className="text-xs text-muted-foreground">
          {draft.trim() && !valid
            ? "Enter a domain like mail.acme.com."
            : "Use a subdomain you control. Sending from it keeps your main domain's reputation separate."}
        </p>
      </div>
      <div>
        <Button
          type="submit"
          disabled={!valid || create.isPending || !organizationId}
        >
          {create.isPending ? "Generating…" : "Generate DNS records"}
        </Button>
      </div>
    </form>
  );
}

/**
 * The email channel's setup: the workspace's sending domains, and the form
 * that adds one. Shared by Integrations -> Channels -> Email and by the
 * sending-domain step of onboarding, so the two always agree.
 *
 * This used to be a card in Settings -> Account. Verifying a domain is part of
 * turning a channel on, the same job on the same day as connecting a source,
 * so it lives with the channels now.
 */
export function SenderDomains({
  defaultDomain = "",
}: {
  /** Seeds the form (onboarding suggests one from the project's website). */
  defaultDomain?: string;
}) {
  const { organizationId, query, domains } = useSenderDomains();
  const activeOrg = useOrgSwitcherContextOptional()?.activeOrg;
  const orgName = activeOrg?.name ?? activeOrg?.slug;
  const pager = usePagination(domains ?? [], DOMAINS_PER_PAGE);
  const [adding, setAdding] = useState(false);

  if (query.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-1 w-full rounded-full" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3">
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load your sending domains.
        </p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!domains || domains.length === 0) {
    return (
      <AddDomainForm
        organizationId={organizationId}
        defaultDomain={defaultDomain}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6 divide-y divide-border [&>*+*]:pt-6">
        {pager.items.map((domain) => (
          <SenderDomainPanel
            key={domain.id}
            domain={domain}
            organizationId={organizationId}
            orgName={orgName}
          />
        ))}
      </div>
      <ListPager pagination={pager} label="domains" />

      <div className="border-t border-border pt-5">
        {adding ? (
          <AddDomainForm
            organizationId={organizationId}
            defaultDomain=""
            onAdded={() => setAdding(false)}
          />
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Icon icon={PlusSignIcon} className="size-4" />
            Add another domain
          </Button>
        )}
      </div>
    </div>
  );
}

export default SenderDomains;
