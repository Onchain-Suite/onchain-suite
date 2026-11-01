"use client";

import { TeamCard } from "../account/team-card";

/**
 * Settings → Team & access. The members roster, invite flow, roles and seat
 * billing now live on their own tab (promoted out of the Account tab to match
 * the 2.7 settings structure); `TeamCard` carries the whole surface.
 */
export default function TeamAccessSettings() {
  return (
    <div className="space-y-6">
      <TeamCard />
    </div>
  );
}
