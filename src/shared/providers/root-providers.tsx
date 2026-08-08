"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";
import { mutate as swrMutate, SWRConfig } from "swr";

import { CommandPaletteProvider } from "@/components/common/command-palette";
import { BackToTop } from "@/ui/back-to-top";
import { Toaster } from "@/ui/sonner";

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

export const RootProviders = ({ children }: { children: ReactNode }) => {
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
