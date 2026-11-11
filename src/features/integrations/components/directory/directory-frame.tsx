import { cn } from "@/lib/utils";

/**
 * The frame Sources and Migrate share (2.7): search across the top, categories
 * down one side, cards in the other. On a window wide enough for two columns
 * the frame fills the height it is given and only the rail and the cards
 * scroll, each inside its own box, so the search and the page header stay put.
 * Below that it stacks and the page scrolls as usual.
 */
export function DirectoryFrame({
  search,
  rail,
  children,
}: {
  search: React.ReactNode;
  /** The category rail. Left out while searching, when results span them all. */
  rail?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5">
      <div className="shrink-0">{search}</div>
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-5 md:grid md:gap-7",
          rail
            ? "md:grid-cols-[210px_minmax(0,1fr)]"
            : "md:grid-cols-[minmax(0,1fr)]"
        )}
      >
        {rail ? <div className="min-h-0 md:overflow-y-auto">{rail}</div> : null}
        <div className="flex min-h-0 min-w-0 flex-col gap-5 md:overflow-y-auto md:pr-1">
          {children}
        </div>
      </div>
    </div>
  );
}

/** A category's heading over its grid of cards. */
export function DirectoryGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-(--text-primary)">
        {label}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}
