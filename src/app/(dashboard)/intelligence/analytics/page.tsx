import { notFound } from "next/navigation";

import { ComingSoonSection } from "@/features/common/layout/components/coming-soon-section";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";
import { getWipSection } from "@/shared/config/wip-sections";

export const dynamic = "force-dynamic";

/**
 * Analytics is a top-level nav entry in the reference shell, but its dedicated
 * report surface is still in progress. Render the coming-soon panel directly so
 * the route resolves (no 404) in every environment - the group layout only
 * swaps in the panel when WIP sections are hidden, which isn't the case in dev.
 */
export default function AnalyticsPage() {
  const section = getWipSection(PRIVATE_ROUTES.ANALYTICS);
  if (!section) notFound();
  return <ComingSoonSection section={section} />;
}
