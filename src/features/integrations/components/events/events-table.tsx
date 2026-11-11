/*
 * The table inside an Events pane: one grid shared by the head and every row,
 * in a box that scrolls on its own from md up with the head held.
 */

const HEAD =
  "sticky top-0 z-[1] grid items-center gap-3.5 border-b border-(--border-subtle) bg-(--bg-shell) px-4 py-2.5 text-[11px] font-semibold tracking-[0.3px] text-(--text-tertiary) uppercase";
const ROW =
  "grid items-center gap-3.5 border-b border-(--border-subtle) px-4 py-3 text-[13px] text-(--text-secondary) last:border-0";

/** The table box: scrolls on its own from md up, header held. */
export function EventsTable({
  columns,
  head,
  children,
}: {
  /** A `grid-template-columns` value shared by the head and every row. */
  columns: string;
  head: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-0 flex-1 overflow-hidden rounded-xl border border-(--border-subtle) bg-card md:overflow-y-auto"
      style={{ ["--cols" as string]: columns }}
    >
      <div className={`${HEAD} [grid-template-columns:var(--cols)]`}>
        {head}
      </div>
      {children}
    </div>
  );
}

/** One row of an {@link EventsTable}. */
export function EventsRow({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${ROW} [grid-template-columns:var(--cols)]`}>
      {children}
    </div>
  );
}

/** What a pane says when it has nothing to list. */
export function EventsEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-(--border-default) px-6 py-10 text-center text-[13px] leading-relaxed text-(--text-secondary)">
      {children}
    </div>
  );
}
