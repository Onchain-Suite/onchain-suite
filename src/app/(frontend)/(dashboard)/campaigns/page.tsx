import { headers } from "next/headers";

import { getAuthSession } from "@/lib/guard";
import { isJsonObject } from "@/lib/utils";

import { NewUserFlow } from "@/features/campaigns/components/new-user";
import { CampaignsListsView } from "@/features/campaigns/pages";

export const dynamic = "force-dynamic";

export default async function CampaignsListsPage() {
  const session = await getAuthSession();
  const isNewUser = Boolean(session?.user?.isNewUser);
  const activeUserId =
    typeof session?.user?.id === "string" ? session.user.id : undefined;

  const headersList = await headers();
  const cookie = headersList.get("cookie") ?? "";

  const forwardedProto = headersList.get("x-forwarded-proto") ?? "http";
  const forwardedHost =
    headersList.get("x-forwarded-host") ?? headersList.get("host");
  const inferredBase = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : null;

  const appBase =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    inferredBase ??
    "http://localhost:3000";
  const appClean = appBase.replace(/\/$/, "");

  let campaignsCount = 0;
  try {
    const res = await fetch(`${appClean}/api/v1/campaigns?page=1&limit=1`, {
      headers: { Cookie: cookie },
      cache: "no-store",
    });

    if (res.ok) {
      const json: unknown = await res.json();

      const pickTotal = (value: unknown): unknown => {
        if (!isJsonObject(value)) return undefined;
        if ("total" in value) return value.total;
        if (
          "meta" in value &&
          isJsonObject(value.meta) &&
          "total" in value.meta
        ) {
          return value.meta.total;
        }
        if (
          "pagination" in value &&
          isJsonObject(value.pagination) &&
          "total" in value.pagination
        ) {
          return value.pagination.total;
        }
        if ("data" in value) return pickTotal(value.data);
        return undefined;
      };

      const total = Number(pickTotal(json));

      if (Number.isFinite(total)) {
        campaignsCount = total;
      } else {
        const getList = (value: unknown): unknown => {
          if (!isJsonObject(value)) return value;
          if ("items" in value) return value.items;
          if ("data" in value) return getList(value.data);
          return value;
        };
        const list = getList(json);
        const arr = Array.isArray(list) ? list : [];
        campaignsCount = arr.length;
      }
    }
  } catch (_e) {
    String(_e);
  }

  const shouldShowNewUserFlow = isNewUser && campaignsCount === 0;

  if (shouldShowNewUserFlow && activeUserId) {
    // TODO: Update user isNewUser status via API
    // await apiClient.put('/user/profile', { isNewUser: false });
  }

  return shouldShowNewUserFlow ? <NewUserFlow /> : <CampaignsListsView />;
}
