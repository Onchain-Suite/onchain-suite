import { redirect } from "next/navigation";

import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

/**
 * The standalone create page was a weaker duplicate of the segment builder in
 * `/intelligence?tab=segments` (which has the AI builder + live preview). It's
 * been consolidated onto that one builder; this route now just redirects there
 * so any bookmarked/legacy links keep working.
 */
export default function CreateSegmentRedirect() {
  redirect(PRIVATE_ROUTES.INTELLIGENCE_SEGMENTS);
}
