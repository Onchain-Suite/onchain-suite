// The slim bar above the page: the sidebar trigger, the project name, search and the theme toggle.
// Server component; the interactive pieces are their own client components.
import { site } from '@/site.config';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { CommandMenu } from '@/components/command-menu';
import { ThemeToggle } from '@/components/ThemeToggle';

export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4 data-vertical:self-auto" />
        <span className="truncate text-base font-medium">{site.name}</span>
        <div className="ml-auto flex items-center gap-2">
          <CommandMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
