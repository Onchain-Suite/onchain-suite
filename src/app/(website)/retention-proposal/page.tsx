import { permanentRedirect } from "next/navigation";

/**
 * The page moved to /retention-playbook. Early preview links keep working:
 * the query (?client=, ?category=) is carried over, and browsers keep any
 * #section across the redirect.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of Array.isArray(value) ? value : [value]) {
      if (v !== undefined) {
        params.append(key, v);
      }
    }
  }
  const query = params.toString();
  permanentRedirect(`/retention-playbook${query ? `?${query}` : ""}`);
}
