"use client";

import { useQuery } from "@tanstack/react-query";

import { integrationsAnswer } from "../utils/answer";
import { useChannelReadiness } from "@/features/channels/hooks/use-channel-readiness";
import { projectSettingsKey } from "@/features/settings/components/account/project-card";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";
import { projectSettingsService } from "@/features/settings/project-settings.service";

const PURPOSE =
  "Every connection in and out: where people come from, and how your messages reach them.";

/**
 * The sentence under the Integrations title. Its reads are the ones the
 * Sources and Channels tabs make anyway (same query keys), so it costs
 * nothing extra once either tab has loaded. Until both have answered it says
 * what the page is for, so nothing is claimed that has not been read.
 */
export function IntegrationsAnswerLine() {
  const { organizationId } = useAccountOrg();
  const settings = useQuery({
    queryKey: projectSettingsKey(organizationId),
    enabled: Boolean(organizationId),
    retry: false,
    queryFn: () =>
      projectSettingsService.getProjectSettings(organizationId ?? undefined),
  });
  const { readiness, isLoading } = useChannelReadiness();

  if (isLoading || !settings.isSuccess) return <>{PURPOSE}</>;

  const statusOf = (id: "email" | "push") =>
    readiness.find((r) => r.id === id)?.status ?? "none";
  const answer = integrationsAnswer({
    contracts: settings.data.contractAddresses?.length ?? 0,
    email: statusOf("email"),
    push: statusOf("push"),
  });
  if (!answer) return <>{PURPOSE}</>;

  return (
    <>
      <b>{answer.contracts}</b>. Email {answer.email}, and in-app push{" "}
      {answer.push}.
    </>
  );
}
