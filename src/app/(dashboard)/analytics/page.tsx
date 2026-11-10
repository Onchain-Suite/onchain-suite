import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Page() {
  // Analytics opens on All dashboards: the front door to the numbers (2.7).
  redirect("/analytics/all");
}
