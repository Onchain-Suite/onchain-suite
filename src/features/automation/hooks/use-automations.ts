import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { automationService } from "../automation.service";

/**
 * Delete an automation and refresh the list/metrics. Invalidates the broad
 * `["automations"]` key so list, counts and metrics all refetch.
 */
export function useDeleteAutomation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => automationService.deleteAutomation(id),
    onSuccess: () => {
      toast.success("Automation deleted");
      queryClient
        .invalidateQueries({ queryKey: ["automations"] })
        .catch(() => undefined);
      onSuccess?.();
    },
    onError: (e) =>
      toast.error(
        e instanceof Error ? e.message : "Failed to delete automation"
      ),
  });
}
