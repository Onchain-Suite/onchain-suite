import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Analytics moved to the top-level /analytics route (v2.7). Keep old links working.
export default function Page() {
  redirect("/analytics/overview");
}
