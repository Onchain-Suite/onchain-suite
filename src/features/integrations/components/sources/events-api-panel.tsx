import Link from "next/link";

import { CopyButton } from "@/components/common/copy-button";
import { Button } from "@/components/ui/button";

/** Same base the API tab shows. */
const EVENTS_URL = "https://api.onchainsuite.com/api/v1/events";

const EXAMPLE = `curl -X POST ${EVENTS_URL} \\
  -H "Authorization: Bearer sk_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": "deposit_completed",
    "contact": { "walletAddress": "0x…" },
    "attributes": { "amount": 250 }
  }'`;

/**
 * The SDK and inbound-webhook sources are the same route: `POST /events`
 * (or `/events/batch`, up to 100) with a secret key. Nothing to connect, so
 * this shows the call and points at the API tab for the key.
 */
export function EventsApiPanel() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Send events from your backend with a secret key. Each needs an{" "}
        <code className="text-xs">event</code> name (lowercase, up to 64
        characters) and a contact by wallet, email or your own id. Up to 100 at
        a time go to <code className="text-xs">/events/batch</code>.
      </p>
      <div className="relative">
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 pr-10 text-xs leading-relaxed text-foreground">
          {EXAMPLE}
        </pre>
        <div className="absolute right-2 top-2">
          <CopyButton value={EXAMPLE} label="Copy example" />
        </div>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link href="/integrations?tab=api">Get a secret key</Link>
      </Button>
    </div>
  );
}
