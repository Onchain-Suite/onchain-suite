import type { NextRequest } from "next/server";

/** What every audience job route needs, resolved once by the handler. */
export interface AudienceJobContext {
  req: NextRequest;
  orgId: string;
  backendBase: string;
  backendHeaders: Headers;
}

export interface AudienceJobRouteContext extends AudienceJobContext {
  method: string;
  jobId: string | null | undefined;
  extra: string | null | undefined;
}
