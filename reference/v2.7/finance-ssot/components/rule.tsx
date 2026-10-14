// The gallery's unit: one component or pattern, with the rule for when to reach for it and when not
// to, above a live example. Every entry in Components and Patterns is one of these, so the guidance
// lives beside the thing rather than in a document nobody opens.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function Rule({ title, use, not, children, className }: { title: string; use: string; not: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn('@container/card', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          <b className="font-medium text-foreground">Use for</b> {use} <b className="font-medium text-foreground">Not for</b> {not}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">{children}</CardContent>
    </Card>
  );
}

/** A section heading inside a long gallery page, with an anchor so a link can point at it. */
export function Section({ id, title, lead }: { id: string; title: string; lead: string }) {
  return (
    <div id={id} className="flex flex-col gap-1 scroll-mt-20 px-4 pt-2 lg:px-6">
      <h2 className="font-serif text-xl font-medium tracking-tight">{title}</h2>
      <p className="max-w-[72ch] text-sm text-muted-foreground">{lead}</p>
    </div>
  );
}

/** One token, shown as the colour it is with the name to copy. */
export function Swatch({ token, name, note }: { token: string; name: string; note?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="size-10 shrink-0 rounded-lg border" style={{ background: `var(${token})` }} />
      <div className="min-w-0 leading-tight">
        <div className="truncate font-mono text-xs">{token}</div>
        <div className="truncate text-xs text-muted-foreground">{name}{note ? ` · ${note}` : ''}</div>
      </div>
    </div>
  );
}
