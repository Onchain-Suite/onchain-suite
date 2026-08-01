"use client";

import { createContext, useContext } from "react";

import { type UseOrgSwitcher, useOrgSwitcher } from "../hooks/use-org-switcher";

const OrgSwitcherContext = createContext<UseOrgSwitcher | null>(null);

/**
 * Runs the org-switcher hook exactly once for the dashboard shell and shares it
 * with every consumer (the layout's org-resolution gating and the sidebar
 * account block). Mounting the hook twice would double its effects — two
 * auto-select passes and two sets of window listeners — so the state is lifted
 * here instead.
 */
export function OrgSwitcherProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useOrgSwitcher();
  return (
    <OrgSwitcherContext.Provider value={value}>
      {children}
    </OrgSwitcherContext.Provider>
  );
}

export function useOrgSwitcherContext(): UseOrgSwitcher {
  const ctx = useContext(OrgSwitcherContext);
  if (!ctx) {
    throw new Error(
      "useOrgSwitcherContext must be used within an OrgSwitcherProvider"
    );
  }
  return ctx;
}
