"use client";

/**
 * The pane beside the question.
 *
 * A quiet mock of the product with the region the current step affects lit up: name your project
 * and the sidebar's workspace row lights; pick who sets up the channels and the channel rail
 * does; the contract step lights the audience table; the plan step lights the chart. Muted on
 * purpose - it sits next to the only thing that should be asking for attention, the question. All
 * decorative, so the whole aside is aria-hidden.
 */
export type ObPreviewLit =
  "workspace" | "audience" | "channels" | "charts" | "none";

const Bar = ({ className = "" }: { className?: string }) => (
  <span
    className={`block h-1.5 rounded-full bg-muted-foreground/25 ${className}`}
  />
);

export function ObPreview({ lit }: { lit: ObPreviewLit }) {
  const navRows = [0, 1, 2, 3, 4];
  const tableRows = [0, 1, 2, 3, 4, 5, 6, 7];
  return (
    <aside
      aria-hidden
      className="bg-muted/40 hidden overflow-hidden rounded-xl border border-border p-4 lg:block"
    >
      <div className="bg-card flex h-full gap-3 rounded-lg border border-border p-3 shadow-sm">
        {/* Sidebar */}
        <div
          className={`flex w-28 shrink-0 flex-col gap-2 rounded-md p-2 transition-colors ${
            lit === "workspace" ? "bg-primary/10 ring-1 ring-primary/30" : ""
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`h-4 w-4 rounded ${
                lit === "workspace" ? "bg-primary" : "bg-muted-foreground/40"
              }`}
            />
            <Bar
              className={`w-14 ${lit === "workspace" ? "bg-primary/60" : ""}`}
            />
          </div>
          <span className="block h-4 rounded bg-muted-foreground/15" />
          {navRows.map((i) => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <span
                className={`h-2.5 w-2.5 rounded-sm ${
                  lit === "audience" && i === 2
                    ? "bg-primary"
                    : "bg-muted-foreground/30"
                }`}
              />
              <Bar
                className={`w-12 ${
                  lit === "audience" && i === 2 ? "bg-primary/60" : ""
                }`}
              />
            </div>
          ))}
          <div
            className={`mt-1 flex flex-col gap-1.5 rounded-md p-1.5 transition-colors ${
              lit === "channels" ? "bg-primary/10 ring-1 ring-primary/30" : ""
            }`}
          >
            <span className="block h-1 w-8 rounded-full bg-muted-foreground/30" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-sm ${
                    lit === "channels" ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
                <Bar
                  className={`w-10 ${lit === "channels" ? "bg-primary/60" : ""}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="block h-2.5 w-24 rounded-full bg-muted-foreground/30" />
            <span className="block h-5 w-16 rounded-md bg-muted-foreground/15" />
          </div>
          {lit === "charts" ? (
            <div className="flex h-full items-end gap-1.5 rounded-md bg-muted/40 p-3">
              {[38, 52, 44, 66, 58, 78, 70, 92].map((h) => (
                <span
                  key={h}
                  style={{ height: `${h}%` }}
                  className="flex-1 rounded-t bg-primary/70"
                />
              ))}
            </div>
          ) : (
            <div
              className={`flex flex-col gap-2 rounded-md p-2 transition-colors ${
                lit === "audience" ? "bg-primary/5 ring-1 ring-primary/20" : ""
              }`}
            >
              {tableRows.map((r) => (
                <div key={r} className="flex items-center gap-2">
                  <span
                    className={`h-3 w-3 rounded-full ${
                      lit === "audience"
                        ? "bg-primary/70"
                        : "bg-muted-foreground/25"
                    }`}
                  />
                  <Bar className="w-20" />
                  <Bar className="w-10" />
                  <Bar className="ml-auto w-8" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
