import {
  NotificationBell,
  SearchTrigger,
  ThemeModeToggle,
} from "@/components/common";
import { useCommandPalette } from "@/components/common/command-palette";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { OrganizationSwitcher } from "./organization-switcher";

export const DashboardHeader = ({
  breadcrumbs,
  currentPage,
  hasActiveOrganization = true,
}: {
  breadcrumbs?: { href: string; label: string }[];
  currentPage?: string;
  hasActiveOrganization?: boolean;
}) => {
  const palette = useCommandPalette();
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background px-4">
      <div className="flex min-w-0 items-center gap-2">
        {/* Below md the sidebar collapses into its own sheet; this opens it. */}
        <SidebarTrigger className="md:hidden" />
        <Separator
          orientation="vertical"
          className="mr-1 data-[orientation=vertical]:h-4 md:hidden"
        />
        <div className="hidden items-center gap-2 text-sm md:flex">
          {breadcrumbs?.map((crumb, index) => (
            <span key={crumb.href} className="flex items-center gap-2">
              {typeof crumb.href === "string" && crumb.href.length > 0 ? (
                <a href={crumb.href} className="hover:underline">
                  {crumb.label}
                </a>
              ) : (
                <span>{crumb.label}</span>
              )}
              {index < (breadcrumbs?.length ?? 0) - 1 && (
                <span className="text-muted-foreground">/</span>
              )}
            </span>
          ))}
          {currentPage &&
            currentPage !==
              breadcrumbs?.[(breadcrumbs?.length ?? 0) - 1]?.label && (
              <span className="text-foreground">{currentPage}</span>
            )}
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2 px-1 sm:px-4 md:ml-auto">
        <OrganizationSwitcher />
        {/* The sidebar carries the search field; below md it's collapsed away. */}
        {hasActiveOrganization ? (
          <span className="md:hidden">
            <SearchTrigger onClick={() => palette.open()} />
          </span>
        ) : null}
        {hasActiveOrganization ? <NotificationBell /> : null}
        <ThemeModeToggle />
      </div>
    </header>
  );
};
