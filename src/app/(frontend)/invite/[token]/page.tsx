import InviteAcceptView from "@/features/settings/components/invite-accept-view";

export const dynamic = "force-dynamic";

/**
 * Landing page for the emailed invite link. `POST /invites/{token}/accept`
 * requires an authenticated session, so the client view redirects signed-out
 * users to sign-in with a `redirectTo` back to this URL.
 */
export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InviteAcceptView token={token} />;
}
