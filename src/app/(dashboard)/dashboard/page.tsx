import { getAuthSession } from "@/lib/guard";
import { getFullName } from "@/lib/utils";

import { MainDashboard } from "@/features/dashboard/page";
import { nonEmpty } from "@/features/dashboard/utils/text";

export const dynamic = "force-dynamic";

function toTitleName(email?: string): string | undefined {
  if (!email) return undefined;
  const [local] = email.split("@");
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

export default async function DashboardPage() {
  const session = await getAuthSession();
  const firstName =
    typeof session?.user?.firstName === "string"
      ? session.user.firstName
      : undefined;
  const lastName =
    typeof session?.user?.lastName === "string"
      ? session.user.lastName
      : undefined;
  const name =
    typeof session?.user?.name === "string" ? session.user.name : undefined;
  const email =
    typeof session?.user?.email === "string" ? session.user.email : undefined;
  const timezone =
    typeof session?.user?.timezone === "string"
      ? session.user.timezone
      : undefined;
  const firstLast = getFullName(firstName, lastName);
  const fullName =
    name ??
    (firstLast && firstLast.length > 0 ? firstLast : toTitleName(email));
  // Home greets by first name; the workspace it names is read on the client
  // from the active organization, never a placeholder.
  const greetBy = nonEmpty(firstName) ?? nonEmpty(fullName)?.split(/\s+/)[0];

  return <MainDashboard firstName={greetBy} timezone={timezone} />;
}
