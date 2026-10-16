"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";
import { mutate as swrMutate, SWRConfig } from "swr";

import { CommandPaletteProvider } from "@/components/common/command-palette";
import { BackToTop } from "@/ui/back-to-top";
import { Toaster } from "@/ui/sonner";

import { useSession } from "@/lib/auth-client";

import { ThemeProvider } from "./theme-provider";

// Shared query/revalidation defaults - fetch once and cache, instead of
// re-firing every request on window focus / network reconnect (which was
// hammering the API and triggering 429s, e.g. on the org switcher + settings).
export const queryClientDefaults = {
  queries: {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  },
} as const;

function PostHogIdentity() {
  const { data: session, isPending } = useSession();
  const identifiedUserId = useRef<string | null>(null);
  const user = session?.user;

  useEffect(() => {
    if (isPending || !user?.id || identifiedUserId.current === user.id) return;

    if (identifiedUserId.current) {
      posthog.reset();
    }

    posthog.identify(user.id, {
      email: user.email,
      name: user.name,
    });
    identifiedUserId.current = user.id;
  }, [isPending, user?.email, user?.id, user?.name]);

  return null;
}

export const RootProviders = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: queryClientDefaults })
  );

  useEffect(() => {
    const handler = (_event: Event) => {
      queryClient.clear();
      swrMutate(() => true, undefined, { revalidate: false });
    };

    window.addEventListener("onchain:org-changed", handler);
    return () => window.removeEventListener("onchain:org-changed", handler);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <SWRConfig
        value={{
          revalidateOnFocus: false,
          revalidateOnReconnect: false,
          revalidateIfStale: false,
          dedupingInterval: 60_000,
          shouldRetryOnError: false,
        }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PostHogIdentity />
          <CommandPaletteProvider>{children}</CommandPaletteProvider>
          <BackToTop />
        </ThemeProvider>
        <Toaster
          position="top-center"
          toastOptions={{ duration: 3000 }}
          richColors
        />
      </SWRConfig>
    </QueryClientProvider>
  );
};
