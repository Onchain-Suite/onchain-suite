"use client";

import { useQuery } from "@tanstack/react-query";

import { audienceService } from "../audience.service";
import { formatRelativeTime } from "../utils";

/**
 * Recent activity for the contact, from `GET /audience/profiles/:id/activity`.
 * A compact timeline (latest first). Renders nothing when there is no activity
 * or the endpoint isn't available, so the drawer stays clean for quiet wallets.
 */
export function ContactActivityPanel({
  profileId,
  open,
}: {
  profileId: string;
  open: boolean;
}) {
  const query = useQuery({
    queryKey: ["audience", "profile-activity", profileId],
    queryFn: () => audienceService.getProfileActivity(profileId, { limit: 8 }),
    enabled: open && profileId.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const items = query.data?.items ?? [];
  if (query.isError || (items.length === 0 && !query.isLoading)) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Activity
      </p>
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading activity…</p>
      ) : (
        <ul className="space-y-3">
          {items.map((ev) => (
            <li key={ev.id} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-medium text-foreground">
                    {ev.title}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(ev.at)}
                  </span>
                </div>
                {ev.description ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {ev.description}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ContactActivityPanel;
