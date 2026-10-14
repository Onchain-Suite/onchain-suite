// One line at the bottom of every page: what this app is built on and who owns it. Replace the
// footnote in site.config.ts with whatever a reader of this app needs to know.
import { site } from '@/site.config';

export function SiteFooter() {
  return (
    <footer className="mt-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t px-4 py-4 text-xs text-muted-foreground lg:px-6">
      <span className="max-w-[80ch]">{site.footnote}</span>
      <span>{site.owner}</span>
    </footer>
  );
}
