import { getAuthSession } from "@/lib/guard";
import { getFullName } from "@/lib/utils";

import { MainDashboard } from "@/features/dashboard/page";

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
  const isNewUser = Boolean(session?.user?.isNewUser);

  const firstLast = getFullName(firstName, lastName);
  const fullName =
    name ??
    (firstLast && firstLast.length > 0 ? firstLast : toTitleName(email));

  const userData = {
    projectName: "YieldFarm DAO",
    userType: "DeFi" as const,
    trialDaysLeft: 7,
    isNewUser,
    subscriptionTier: "free_trial" as const,
    fullName,
    timezone,
  };
  return <MainDashboard userData={userData} />;
}
