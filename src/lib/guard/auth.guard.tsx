import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { type ReactNode } from "react";

import { getSession } from "@/lib/auth-session";
import { fetchWithTimeout } from "@/lib/server-fetch";

import { AUTH_ROUTES } from "@/shared/config/app-routes";

// Types
interface AuthGuardProps {
  children: ReactNode;
  redirectTo?: string;
  requireRole?: string;
  requireOrganization?: boolean;
}

// Re-export Session type if needed or define a compatible one
// Using the one from auth-session implies we get what the API returns
interface Session {
  user: {
    id: string;
    email: string;
    name?: string;
    role?: string;
    // Add other properties as needed, matching what backend returns
    [key: string]: unknown;
  };
}

// 1. Server Component Guard
export async function AuthGuard({
  children,
  redirectTo = AUTH_ROUTES.LOGIN,
  requireRole,
  requireOrganization = false,
}: AuthGuardProps) {
  const session = await getSession();

  // No session - redirect to login
  if (!session) {
    redirect(redirectTo);
  }

  // Role-based access control (optional)
  if (requireRole && session.user.role !== requireRole) {
    redirect("/unauthorized");
  }

  const headersList = await headers();
  const cookie = headersList.get("cookie") ?? "";

  const cookiePairs = cookie
    .split(";")
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => {
      const idx = p.indexOf("=");
      if (idx === -1) return [p, ""] as const;
      return [p.slice(0, idx), p.slice(idx + 1)] as const;
    });
  const cookieMap = new Map(cookiePairs);
  const onboardingCompleteRaw = cookieMap.get("onchain.onboardingComplete");
  const onboardingComplete =
    onboardingCompleteRaw && decodeURIComponent(onboardingCompleteRaw) === "1";

  if (requireOrganization && !onboardingComplete) {
    const forwardedProto = headersList.get("x-forwarded-proto") ?? "http";
    const forwardedHost =
      headersList.get("x-forwarded-host") ?? headersList.get("host");
    const inferredBase = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : null;

    const appBase =
      inferredBase ??
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.APP_URL ??
      "http://localhost:3000";
    const appClean = appBase.replace(/\/$/, "");

    try {
      // Bounded so a slow org lookup can't hang the dashboard render; on
      // timeout we skip the onboarding redirect (same as the catch below).
      const orgRes = await fetchWithTimeout(
        `${appClean}/api/v1/organization/list`,
        {
          headers: { Cookie: cookie },
          cache: "no-store",
        },
        { timeoutMs: 6000 }
      );

      if (orgRes.ok) {
        const orgJson = await orgRes.json();
        const list = Array.isArray(orgJson)
          ? orgJson
          : Array.isArray(orgJson?.data)
            ? orgJson.data
            : Array.isArray(orgJson?.data?.data)
              ? orgJson.data.data
              : [];

        if (!Array.isArray(list) || list.length === 0) {
          redirect("/onboarding?reason=missing_org");
        }
      }
    } catch (_e) {
      String(_e);
    }
  }

  // Session is valid, render children
  return <>{children}</>;
}

export const ProtectedLayout = AuthGuard;

// 2. Higher-Order Function for Pages
export function withAuth<T extends Record<string, unknown>>(
  WrappedComponent: React.ComponentType<T & { session: Session }>,
  options: { redirectTo?: string; requireRole?: string } = {}
) {
  return async function AuthenticatedComponent(props: T) {
    const session = await getSession();

    if (!session) {
      redirect(options.redirectTo ?? "/");
    }

    if (options.requireRole && session.user.role !== options.requireRole) {
      redirect("/unauthorized");
    }

    return (
      <WrappedComponent {...props} session={session as unknown as Session} />
    );
  };
}

// 3. Auth Hook for Session Data
export async function getAuthSession() {
  return await getSession();
}

// 4. Auth Action (for Server Actions)
export async function requireAuth() {
  const session = await getSession();

  if (!session) {
    redirect(AUTH_ROUTES.LOGIN);
  }

  return session;
}
