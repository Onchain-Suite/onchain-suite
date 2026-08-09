import { redirect } from "next/navigation";

import InviteAcceptView from "@/features/settings/components/invite-accept-view";

export const dynamic = "force-dynamic";

/**
 * Landing page for the emailed invite link in its query-param form
 * (`/invites/accept?token=…` — the shape the backend emails). Renders the
 * same accept flow as `/invite/[token]`.
 */
export default async function InviteAcceptQueryPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = params.token;
  const token = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  if (token.length === 0) redirect("/");
  return <InviteAcceptView token={token} />;
}
