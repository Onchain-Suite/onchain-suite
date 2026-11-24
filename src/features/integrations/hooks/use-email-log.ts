"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import type { EmailListFilters } from "../contracts/emails";
import { DeveloperApiError } from "../developer.service";
import { emailsService, toEmailFailure } from "../emails.service";
import { emailErrorCopy, emailLogKeys } from "../utils/email-log";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";

/** The workspace's Email API log, newest first, one cursor page at a time. */
export function useEmailLog(filters: EmailListFilters) {
  const { organizationId } = useAccountOrg();
  const query = useInfiniteQuery({
    queryKey: emailLogKeys.list(organizationId, filters),
    enabled: Boolean(organizationId),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      emailsService.list(
        filters,
        pageParam,
        organizationId ?? undefined,
        signal
      ),
    getNextPageParam: (last) => (last.has_more ? last.next_cursor : null),
    // A 403 (suspended, or no access) will not change on a retry.
    retry: (count, err) =>
      !(err instanceof DeveloperApiError && err.status === 403) && count < 1,
  });
  return { ...query, organizationId };
}

/** One email with its recipients and events. Closed drawer, no request. */
export function useEmailDetail(id: string | null) {
  const { organizationId } = useAccountOrg();
  return useQuery({
    queryKey: emailLogKeys.detail(organizationId, id),
    enabled: Boolean(organizationId && id),
    queryFn: ({ signal }) =>
      emailsService.get(id as string, organizationId ?? undefined, signal),
    retry: (count, err) =>
      !(
        err instanceof DeveloperApiError &&
        (err.status === 403 || err.status === 404)
      ) && count < 1,
  });
}

/**
 * Reschedule and cancel for a scheduled email. Both race the release sweeper,
 * so a `409 EMAIL_NOT_SCHEDULED` is expected now and then: it is reported as
 * what happened, and the log and the email are re-read either way so the row
 * never keeps offering an action that can no longer work.
 */
export function useEmailActions() {
  const { organizationId } = useAccountOrg();
  const queryClient = useQueryClient();
  const orgId = organizationId ?? undefined;
  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: emailLogKeys.all(organizationId),
    });
  const report = (err: unknown) => {
    const copy = emailErrorCopy(toEmailFailure(err));
    toast.error(copy.title, { description: copy.body });
  };

  const reschedule = useMutation({
    mutationFn: (input: { id: string; scheduledAt: string }) =>
      emailsService.reschedule(input.id, input.scheduledAt, orgId),
    onSuccess: () => toast.success("Email rescheduled."),
    onError: report,
    onSettled: refresh,
  });

  const cancel = useMutation({
    mutationFn: (id: string) => emailsService.cancel(id, orgId),
    onSuccess: () => toast.success("Email canceled. Nothing will be sent."),
    onError: report,
    onSettled: refresh,
  });

  return { reschedule, cancel };
}
