import type { ReactNode } from "react";

// The blog body still uses the `.ocs2` content system (eyebrow, grad, chip,
// post cards, rich text). Keep that stylesheet loaded, but render it inside the
// current `ns` chrome instead of the old v2 PageShell nav/footer, so the blog
// matches the rest of the site. Both systems share the same accent (#1727E0)
// and Instrument Sans, so the content island reads consistently under ns.
import "@/onchain-suite-website/components/landing/v2/landing-v2.css";
import { NsShell } from "@/onchain-suite-website/components/site/ns-shell";

/**
 * Chrome for the blog. Wraps the `.ocs2`-scoped blog content in the redesigned
 * ("ns") navbar + footer (SiteChrome via NsShell), replacing the legacy v2
 * PageShell. Server Component: SiteChrome owns the only client code, so the
 * listing and article markup still render on the server.
 */
export function BlogShell({ children }: { children: ReactNode }) {
  return (
    <NsShell>
      <div className="ocs2">{children}</div>
    </NsShell>
  );
}
