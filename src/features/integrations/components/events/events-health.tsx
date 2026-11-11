import type { HealthTile } from "../../utils/events";

/**
 * How current each source of events is, in a tile each (2.7). The detail line
 * is what the number means, so the tile reads without the table under it.
 */
export function EventsHealth({ tiles }: { tiles: HealthTile[] }) {
  return (
    <section aria-label="Data health" className="grid gap-2.5 sm:grid-cols-2">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="flex min-w-0 flex-col gap-[3px] rounded-xl border border-(--border-subtle) bg-card px-3.5 py-3"
        >
          <span className="text-[11.5px] font-semibold tracking-[0.3px] text-(--text-tertiary) uppercase">
            {tile.label}
          </span>
          <b className="text-[14.5px] font-semibold text-(--text-primary)">
            {tile.headline}
          </b>
          <small className="text-[12.5px] text-(--text-tertiary)">
            {tile.detail}
          </small>
        </div>
      ))}
    </section>
  );
}
