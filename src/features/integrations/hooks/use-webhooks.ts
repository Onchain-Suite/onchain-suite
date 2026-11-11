"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { WebhookEndpoint, WebhookStatus } from "../contracts/developer";
import { developerService } from "../developer.service";
import { developerKeys } from "../utils/developer";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";

const reason = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

/** The workspace's webhook endpoints. */
export function useWebhooks() {
  const { organizationId } = useAccountOrg();
  return useQuery({
    queryKey: developerKeys.webhooks(organizationId),
    enabled: Boolean(organizationId),
    queryFn: () => developerService.listWebhooks(organizationId ?? undefined),
  });
}

/** The topics an endpoint can subscribe to. Changes with a deploy, not a click. */
export function useWebhookTopics(enabled: boolean) {
  const { organizationId } = useAccountOrg();
  return useQuery({
    queryKey: developerKeys.topics(organizationId),
    enabled: enabled && Boolean(organizationId),
    staleTime: 30 * 60 * 1000,
    queryFn: () =>
      developerService.listWebhookEvents(organizationId ?? undefined),
  });
}

/**
 * What can be done to an endpoint from its page: send a test, pause or resume
 * it, and remove it. Pausing shows at once and rolls back if the save fails.
 */
export function useWebhookActions() {
  const { organizationId } = useAccountOrg();
  const queryClient = useQueryClient();
  const key = developerKeys.webhooks(organizationId);
  const orgId = organizationId ?? undefined;
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  const test = useMutation({
    mutationFn: (id: string) => developerService.testWebhook(id, orgId),
    onSuccess: (result) =>
      toast.success(`Test delivered: your endpoint answered ${result.status}.`),
    onError: (err) => toast.error(reason(err, "The test did not get through.")),
    // Either way the endpoint's last delivery and failure count have moved.
    onSettled: refresh,
  });

  const setStatus = useMutation({
    mutationFn: (input: { id: string; status: WebhookStatus }) =>
      developerService.updateWebhook(input.id, { status: input.status }, orgId),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const before = queryClient.getQueryData<WebhookEndpoint[]>(key);
      queryClient.setQueryData<WebhookEndpoint[]>(key, (list) =>
        list?.map((w) =>
          w.id === input.id
            ? {
                ...w,
                status: input.status,
                // Resuming clears the failure streak, as the backend does.
                failureCount: input.status === "active" ? 0 : w.failureCount,
              }
            : w
        )
      );
      return { before };
    },
    onError: (err, _input, context) => {
      if (context?.before) queryClient.setQueryData(key, context.before);
      toast.error(reason(err, "Couldn't update the endpoint."));
    },
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: (id: string) => developerService.deleteWebhook(id, orgId),
    onSuccess: () => toast.success("Endpoint removed."),
    onError: (err) => toast.error(reason(err, "Couldn't remove the endpoint.")),
    onSettled: refresh,
  });

  return { test, setStatus, remove };
}
