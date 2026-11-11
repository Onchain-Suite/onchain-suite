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

/**
 * Duplicate a Loop as a draft: its steps, trigger and email designs, none of
 * its runs. `onDuplicated` gets the copy's id, so the caller can open it.
 */
export function useDuplicateAutomation(onDuplicated?: (id: string) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => automationService.duplicateAutomation(id),
    onSuccess: (result) => {
      queryClient
        .invalidateQueries({ queryKey: ["automations"] })
        .catch(() => undefined);
      const id =
        typeof result?.automationId === "string" ? result.automationId : "";
      if (!id) {
        toast.success("Loop duplicated. The copy is in your drafts.");
        return;
      }
      toast.success("Loop duplicated. Opening the copy.");
      onDuplicated?.(id);
    },
    onError: (e) =>
      toast.error(
        e instanceof Error ? e.message : "Couldn't duplicate the Loop"
      ),
  });
}
