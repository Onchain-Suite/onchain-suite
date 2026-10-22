import { AutomationBuilderSkeleton } from "@/features/automation/components/flow-automation/automation-builder-skeleton";

/**
 * Route-level loading for the builder. Uses the shared skeleton so navigation
 * shows the same bar, canvas and panel the builder hydrates into (no
 * flat-placeholder → spinner → builder jump).
 */
export default function AutomationDetailLoading() {
  return <AutomationBuilderSkeleton />;
}
