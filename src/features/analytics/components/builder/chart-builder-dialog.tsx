"use client";

import { useEffect, useState } from "react";

import type {
  ChartKind,
  ChartSpec,
  MetricId,
} from "../../contracts/dashboards";
import type { AnalyticsPeriod } from "../../contracts/org-analytics";
import { CHART_LABEL, metricDef, METRICS } from "../../data/metric-catalog";
import { MetricBody } from "../metric-card";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

const GROUPS = Array.from(new Set(METRICS.map((m) => m.group)));

/**
 * Add or edit a chart, in one sentence: "Show [measure] as a [chart]". The
 * preview draws the real numbers, so what is saved is what the card shows.
 */
export function ChartBuilderDialog({
  open,
  initial,
  period,
  editing,
  saving,
  onClose,
  onSave,
  onRemove,
}: {
  open: boolean;
  initial: ChartSpec;
  period: AnalyticsPeriod;
  editing: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (spec: ChartSpec) => void;
  onRemove?: () => void;
}) {
  const [spec, setSpec] = useState(initial);
  const [titleTouched, setTitleTouched] = useState(editing);
  useEffect(() => {
    if (open) {
      setSpec(initial);
      setTitleTouched(editing);
    }
  }, [open, initial, editing]);

  const def = metricDef(spec.metric);
  const setMetric = (metric: MetricId) => {
    const next = metricDef(metric);
    setSpec((s) => ({
      ...s,
      metric,
      chart: next.charts.includes(s.chart)
        ? s.chart
        : (next.charts[0] ?? "bar"),
      // The title follows the measure until someone types their own.
      title: titleTouched ? s.title : next.label,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit chart" : "New chart"}</DialogTitle>
          <DialogDescription>
            Pick a measure and how to draw it. It uses the dashboard&apos;s
            period.
          </DialogDescription>
        </DialogHeader>
        <div className="an-cb">
          <input
            className="an-cb__title"
            aria-label="Chart title"
            value={spec.title}
            onChange={(e) => {
              setTitleTouched(true);
              setSpec((s) => ({ ...s, title: e.target.value }));
            }}
          />
          <p className="an-cb__sentence">
            Show
            <select
              className="an-cb__pick"
              aria-label="Measure"
              value={spec.metric}
              onChange={(e) => setMetric(e.target.value as MetricId)}
            >
              {GROUPS.map((g) => (
                <optgroup key={g} label={g}>
                  {METRICS.filter((m) => m.group === g).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label.toLowerCase()}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            as a
            <select
              className="an-cb__pick"
              aria-label="Chart"
              value={spec.chart}
              onChange={(e) =>
                setSpec((s) => ({ ...s, chart: e.target.value as ChartKind }))
              }
            >
              {def.charts.map((c) => (
                <option key={c} value={c}>
                  {CHART_LABEL[c]}
                </option>
              ))}
            </select>
          </p>
          <p className="an-cb__hint">
            {def.description}{" "}
            {def.periodic
              ? "Follows the period picker."
              : "Always the latest numbers."}
          </p>
          <div className="an-cb__preview">
            <MetricBody
              metric={spec.metric}
              chart={spec.chart}
              period={period}
              className="h-[220px]"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {editing && onRemove ? (
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={onRemove}
            >
              Remove chart
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={saving || !spec.title.trim()}
              onClick={() => onSave({ ...spec, title: spec.title.trim() })}
            >
              {saving ? "Saving…" : "Save to dashboard"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
