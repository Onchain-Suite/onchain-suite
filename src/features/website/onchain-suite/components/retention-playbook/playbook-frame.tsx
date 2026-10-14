"use client";

import type { ReactNode } from "react";

import { usePlaybook } from "./playbook-context";
import type { CategoryId } from "@/onchain-suite-website/types/retention-playbook";

/**
 * Shows one playbook at a time. All three are server rendered; the two the
 * reader did not pick stay hidden (and out of the accessibility tree) until
 * they switch. ?category= sets the first pick on the server, so a sent link
 * opens with its playbook already showing.
 */
export function PlaybookFrame({
  id,
  children,
}: {
  id: CategoryId;
  children: ReactNode;
}) {
  const { category } = usePlaybook();
  return (
    <div className="rp-pb-frame" hidden={category !== id}>
      {children}
    </div>
  );
}
