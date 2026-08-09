import { redirect } from "next/navigation";

/**
 * Alias kept so both /thank-you and /payment/thank-you work as the
 * Blockradar payment-link redirect target. Query params (e.g. ?reference=)
 * are forwarded.
 */
export default async function ThankYouAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value) && value[0]) qs.set(key, value[0]);
  }
  const suffix = qs.toString();
  redirect(`/payment/thank-you${suffix ? `?${suffix}` : ""}`);
}
