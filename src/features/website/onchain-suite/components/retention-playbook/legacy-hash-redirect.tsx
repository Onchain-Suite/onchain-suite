"use client";

import { useEffect } from "react";

import {
  categoryOfAnchor,
  playbookPath,
} from "@/onchain-suite-website/utils/retention-playbook-params";

/**
 * The playbooks used to live on this page behind anchors, so links already
 * sent to prospects look like #defi or #defi-retention-triggers. A hash never
 * reaches the server, so this sends those readers to the playbook's own page
 * and keeps the section they were pointed at.
 *
 * A full document navigation, not router.replace: a soft navigation leaves the
 * hash already in the URL, so the browser never runs its own scroll and the
 * reader lands at the top of the playbook instead of on their section.
 */
export function LegacyHashRedirect({ client }: { client: string | null }) {
  useEffect(() => {
    const anchor = decodeURIComponent(window.location.hash.slice(1));
    const category = categoryOfAnchor(anchor);
    if (!category) {
      return;
    }
    const path = playbookPath(category, client);
    window.location.replace(anchor === category ? path : `${path}#${anchor}`);
  }, [client]);

  return null;
}
