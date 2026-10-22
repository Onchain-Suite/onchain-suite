import type { NextRequest } from "next/server";

import type { getInboxStore } from "@/server/inbox-state";

/** What the inbox sub-routes share, resolved once by the handler. */
export interface InboxContext {
  req: NextRequest;
  method: string;
  path: string[];
  store: ReturnType<typeof getInboxStore>;
  nowIso: () => string;
  computeUnread: () => number;
  orgId: string;
  userKey: string;
}
