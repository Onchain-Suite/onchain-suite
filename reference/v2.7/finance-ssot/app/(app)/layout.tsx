// The frame every app page shares: shadcn's inset Sidebar with the project's nav, a slim header, and a
// footer. A page renders its own sections into the column, which keeps the vertical rhythm for them.
import { AppSidebar } from '@/components/app-sidebar';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider style={{ '--sidebar-width': 'calc(var(--spacing) * 64)', '--header-height': 'calc(var(--spacing) * 12)' } as React.CSSProperties}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div data-slot="page" className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">{children}</div>
          </div>
          <SiteFooter />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
