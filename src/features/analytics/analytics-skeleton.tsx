/**
 * The analytics loading shape, shared by the route `loading.tsx` files so
 * navigation shows the layout the page settles into: heading, tab bar, the
 * headline strip, then the first row of cards.
 */
export function AnalyticsSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-[1560px] flex-col gap-4"
      aria-hidden="true"
    >
      <div className="h-9 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-10 w-full animate-pulse rounded-md border-b border-border bg-muted/40" />
      <div className="h-[84px] w-full animate-pulse rounded-lg border border-border bg-card" />
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="h-[280px] animate-pulse rounded-lg border border-border bg-card lg:col-span-2" />
        <div className="h-[280px] animate-pulse rounded-lg border border-border bg-card" />
        <div className="h-[280px] animate-pulse rounded-lg border border-border bg-card" />
        <div className="h-[280px] animate-pulse rounded-lg border border-border bg-card" />
        <div className="h-[280px] animate-pulse rounded-lg border border-border bg-card" />
      </div>
    </div>
  );
}
