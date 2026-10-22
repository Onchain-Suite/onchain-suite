import { redirect } from "next/navigation";

/**
 * The backend's OAuth callback lands here (`/settings/integrations?connected=`
 * or `?error=`). Integrations moved to its own screen, so forward to the
 * Migrate tab (every OAuth connector today is a migration) with the outcome.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = new URLSearchParams({ tab: "migrate" });
  for (const key of ["connected", "error", "connector"]) {
    const v = params[key];
    if (typeof v === "string" && v) next.set(key, v);
  }
  redirect(`/integrations?${next.toString()}`);
}
