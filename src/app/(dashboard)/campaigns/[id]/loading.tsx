export default function CampaignDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6" aria-hidden="true">
      <div className="h-8 w-64 animate-pulse rounded bg-card/60" />
      <div className="h-28 animate-pulse rounded-2xl border border-border bg-card/60" />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-card/60" />
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-card/60" />
      </div>
      <div className="h-56 animate-pulse rounded-2xl border border-border bg-card/60" />
    </div>
  );
}
