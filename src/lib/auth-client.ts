import {
  organizationClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import posthog from "posthog-js";
import { toast } from "sonner";

import { AUTH_ROUTES, PRIVATE_ROUTES } from "@/shared/config/app-routes";

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/v1/auth`;
  }
  return process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/auth`
    : "http://localhost:3000/api/v1/auth";
};

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  sessionOptions: {
    refetchInterval: 0,
    refetchOnWindowFocus: false,
    refetchWhenOffline: false,
  },
  plugins: [organizationClient(), twoFactorClient()],
});

export const { useSession } = authClient;

const findRedirectUrl = (payload: unknown): string | null => {
  if (typeof payload !== "object" || payload === null) return null;
  const obj = payload as Record<string, unknown>;
  const redirectObj =
    typeof obj.redirect === "object" && obj.redirect !== null
      ? (obj.redirect as Record<string, unknown>)
      : null;
  const dataObj =
    typeof obj.data === "object" && obj.data !== null
      ? (obj.data as Record<string, unknown>)
      : null;
  const candidates: Array<unknown> = [
    obj.url,
    obj.redirectUrl,
    obj.redirectURL,
    redirectObj?.url,
    redirectObj?.to,
    redirectObj?.href,
    redirectObj?.location,
    dataObj?.url,
  ];
  const url = candidates.find(
    (v) => typeof v === "string" && v.trim().length > 0
  ) as string | undefined;
  return url ?? null;
};

export const signInWithGoogle = async (opts?: {
  idToken?: string;
  callbackURL?: string;
  newUserCallbackURL?: string;
}) => {
  try {
    const toAbsoluteInBrowser = (url: string): string => {
      if (typeof window === "undefined") return url;
      const trimmed = url.trim();
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return trimmed;
      }
      if (trimmed.startsWith("/")) {
        return `${window.location.origin}${trimmed}`;
      }
      return trimmed;
    };

    type SocialPayload = Parameters<typeof authClient.signIn.social>[0];
    const callbackURL = toAbsoluteInBrowser(
      opts?.callbackURL ?? PRIVATE_ROUTES.DASHBOARD
    );
    const newUserCallbackURL = toAbsoluteInBrowser(
      opts?.newUserCallbackURL ?? AUTH_ROUTES.ONBOARDING
    );
    const payload = {
      provider: "google",
      callbackURL,
      newUserCallbackURL,
      ...(opts?.idToken ? { idToken: { token: opts.idToken } } : {}),
    } satisfies SocialPayload;

    const data = await authClient.signIn.social(payload);
    const redirectUrl = findRedirectUrl(data);
    if (redirectUrl && typeof window !== "undefined") {
      window.location.href = redirectUrl;
    }
    return data;
  } catch (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          posthog.reset();
          toast.success("Successfully signed out!");
          window.location.href = "/";
        },
      },
    });
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
};
