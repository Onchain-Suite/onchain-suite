"use client";

import { ArrowLeftIcon, PlusIcon } from "@heroicons/react/24/outline";

import { CopyButton } from "@/components/common/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { connectorFor } from "../../data/connectors";
import { FRESHNESS, LANE_LABEL, SOURCE_KINDS } from "../../data/sources";
import type { DataSource, SourceStatus } from "../../types/sources";
import { setupDocUrl } from "../../utils/sources";
import { SourceMark } from "./source-visuals";

export function SourceDetail({
  source,
  status,
  onBack,
  onConnect,
}: {
  source: DataSource;
  status?: SourceStatus;
  onBack: () => void;
  onConnect: (source: DataSource) => void;
}) {
  const kindLabel = SOURCE_KINDS.find((k) => k.id === source.kind)?.label;
  const effective = status ?? source.status;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Sources
      </button>

      <header className="flex flex-wrap items-center gap-4">
        <SourceMark source={source} className="size-12" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {source.name}
          </h2>
          <p className="text-sm text-muted-foreground">{source.gives}</p>
        </div>
        {effective === "connected" ? (
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            >
              Connected
            </Badge>
            {connectorFor(source.id) ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onConnect(source)}
              >
                Manage
              </Button>
            ) : null}
          </div>
        ) : effective === "soon" ? (
          <Badge variant="outline" className="text-muted-foreground">
            Not available yet
          </Badge>
        ) : (
          <Button size="sm" onClick={() => onConnect(source)}>
            <PlusIcon aria-hidden="true" className="mr-1.5 size-4" />
            Connect
          </Button>
        )}
      </header>

      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <aside className="space-y-3 text-sm">
          <MetaRow label="Category" value={kindLabel} />
          <MetaRow label="Built by" value={source.by ?? "OnchainSuite"} />
          <MetaRow
            label="Data arrives"
            value={FRESHNESS[source.freshness].label}
          />
          <MetaRow label="Contributes" value={LANE_LABEL[source.lane]} />
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Setup guide</div>
            <div className="flex items-center gap-1.5">
              <code className="truncate rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {setupDocUrl(source.id)}
              </code>
              <CopyButton
                value={setupDocUrl(source.id)}
                label="Copy setup link"
              />
            </div>
          </div>
        </aside>

        <div className="space-y-4 text-sm leading-relaxed text-foreground">
          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold text-foreground">Overview</h3>
            <p className="text-muted-foreground">
              {source.about ?? source.gives}
            </p>
          </section>

          {source.how ? (
            <section className="space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground">
                How it works
              </h3>
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                {source.how.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold text-foreground">
              What it can trigger
            </h3>
            <p className="text-muted-foreground">
              {FRESHNESS[source.freshness].can}
            </p>
          </section>

          {source.configure ? (
            <section className="space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground">
                Configure
              </h3>
              <p className="text-muted-foreground">{source.configure}</p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium text-foreground">{value ?? "-"}</div>
    </div>
  );
}
