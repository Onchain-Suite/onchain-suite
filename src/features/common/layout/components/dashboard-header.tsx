import {
  NotificationBell,
  SearchTrigger,
  ThemeModeToggle,
} from "@/components/common";
import { useCommandPalette } from "@/components/common/command-palette";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import type { Crumb } from "../utils/breadcrumbs";
import { Breadcrumbs } from "./breadcrumbs";

export const DashboardHeader = ({
  breadcrumbs,
  hasActiveOrganization = true,
}: {
  breadcrumbs: Crumb[];
  hasActiveOrganization?: boolean;
}) => {
  const palette = useCommandPalette();
  return (
    // 52px bar inside the raised workspace panel, as in the 2.7 reference.
    <header className="sticky top-0 z-10 flex h-[52px] shrink-0 items-center justify-between gap-2 border-b border-(--border-subtle) bg-(--bg-main) px-4 md:px-5">
      <div className="flex min-w-0 items-center gap-2">
        {/* Below md the sidebar collapses into its own sheet; this opens it. */}
        <SidebarTrigger className="md:hidden" />
        <Separator
          orientation="vertical"
          className="mr-1 data-[orientation=vertical]:h-4 md:hidden"
        />
        <Breadcrumbs crumbs={breadcrumbs} />
      </div>

      <div className="flex min-w-0 items-center gap-2 px-1 sm:px-4 md:ml-auto">
        {/* Workspace switching now lives in the account menu (bottom of the
            sidebar), matching the reference shell - no top-bar switcher. */}
        {/* Search now lives in the header (the sidebar no longer carries it). */}
        {hasActiveOrganization ? (
          <SearchTrigger onClick={() => palette.open()} />
        ) : null}
        {hasActiveOrganization ? <NotificationBell /> : null}
        <ThemeModeToggle />
      </div>
    </header>
  );
};
