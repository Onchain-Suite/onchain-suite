'use client';
// Search, on every page: cmd+k or the button. Groups the project's pages and their children, plus the
// Datum links. Mounted only while open, so the dialog costs nothing on a page nobody searches from.
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowSquareOutIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { site } from '@/site.config';
import { Button } from '@/components/ui/button';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from '@/components/ui/command';

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((v) => !v); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const go = (href: string) => { setOpen(false); router.push(href); };
  const pages = site.nav.flatMap((n) => [{ href: n.href, label: n.label, hint: '' }, ...(n.children ?? []).map((c) => ({ href: c.href, label: c.label, hint: n.label }))]);
  return (
    <>
      <Button variant="outline" size="sm" className="text-muted-foreground" onClick={() => setOpen(true)}>
        <MagnifyingGlassIcon /><span className="hidden md:inline">Search</span>
        <CommandShortcut className="hidden md:inline">⌘K</CommandShortcut>
      </Button>
      {open ? (
        <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Jump to a page">
          <Command>
            <CommandInput placeholder="Search pages" />
            <CommandList>
              <CommandEmpty>Nothing matches.</CommandEmpty>
              <CommandGroup heading="Pages">
                {pages.map((p) => (
                  <CommandItem key={p.href} value={`${p.label} ${p.hint}`} onSelect={() => go(p.href)}>
                    <MagnifyingGlassIcon /><span>{p.label}</span>{p.hint ? <CommandShortcut>{p.hint}</CommandShortcut> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Datum">
                {site.links.map((l) => (
                  <CommandItem key={l.href} value={l.label} onSelect={() => { setOpen(false); window.open(l.href, '_blank', 'noreferrer'); }}>
                    <ArrowSquareOutIcon /><span>{l.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </CommandDialog>
      ) : null}
    </>
  );
}
