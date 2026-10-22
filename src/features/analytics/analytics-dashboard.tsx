"use client";

import {
  ArrowDownTrayIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import "./components/analytics.css";
import { ChartBuilderDialog } from "./components/builder/chart-builder-dialog";
import { BuiltInCards } from "./components/builtin-tab";
import { DashboardsIndex } from "./components/dashboards/dashboards-index";
import { DeleteDashboardDialog } from "./components/dashboards/delete-dialog";
import { NameDialog } from "./components/dashboards/name-dialog";
import { PublishDialog } from "./components/dashboards/publish-dialog";
import { MetricCard } from "./components/metric-card";
import { TabBar } from "./components/tab-bar";
import type {
  ChartSpec,
  Dashboard,
  DashboardSummary,
} from "./contracts/dashboards";
import type { AnalyticsPeriod } from "./contracts/org-analytics";
import { useAnalyticsExport } from "./hooks/use-analytics-export";
import {
  useDashboard,
  useDashboardActions,
  useDashboardList,
} from "./hooks/use-dashboards";
import { describeChart, isBuiltIn, newChartSpec } from "./utils/dashboards";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

const PERIODS: AnalyticsPeriod[] = ["7d", "30d", "90d"];

/**
 * Analytics, after the reference dashboard: four built-in tabs on real data,
 * dashboards people make from the same measures, and read-only links to them.
 * `dash` is a built-in tab, `all` (the index), or a custom dashboard's id.
 */
export function AnalyticsDashboard({ dash }: { dash: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const isIndex = dash === "all";
  const one = useDashboard(isIndex ? "overview" : dash);
  const list = useDashboardList();
  const actions = useDashboardActions();
  const dashboard = isIndex ? null : (one.data ?? null);

  const fromUrl = params?.get("period") as AnalyticsPeriod | null;
  const period: AnalyticsPeriod =
    fromUrl && PERIODS.includes(fromUrl)
      ? fromUrl
      : (dashboard?.period ?? "30d");
  const setPeriod = (p: AnalyticsPeriod) => {
    const next = new URLSearchParams(params?.toString());
    next.set("period", p);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const [builder, setBuilder] = useState<{
    spec: ChartSpec;
    editing: boolean;
  } | null>(null);
  const [naming, setNaming] = useState<
    { mode: "new" } | { mode: "rename"; target: DashboardSummary } | null
  >(null);
  const [deleting, setDeleting] = useState<DashboardSummary | null>(null);
  const [publishing, setPublishing] = useState(false);
  const { exportCsv, exporting } = useAnalyticsExport(dashboard, period);

  const customCount = (list.data ?? []).filter((d) => !d.builtIn).length;
  const openBuilder = () =>
    setBuilder({ spec: newChartSpec(), editing: false });

  const saveChart = async (spec: ChartSpec) => {
    if (!dashboard) return;
    try {
      await actions.saveChart(dashboard, spec);
      setBuilder(null);
      toast.success(
        builder?.editing ? "Chart updated" : `Added to ${dashboard.name}`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save the chart");
    }
  };

  const confirmName = async (name: string) => {
    try {
      if (naming?.mode === "rename") {
        await actions.update.mutateAsync({
          id: naming.target.id,
          body: { name },
        });
        toast.success("Renamed");
      } else {
        const created = await actions.create.mutateAsync(name);
        router.push(`/analytics/${created.id}`);
      }
      setNaming(null);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Couldn't save the dashboard"
      );
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    await actions.remove.mutateAsync(target.id);
    toast.success(`“${target.name}” deleted`);
    if (dash === target.id) router.push("/analytics/all");
  };

  const duplicate = async (d: DashboardSummary) => {
    const copy = await actions.duplicate.mutateAsync(d.id);
    toast.success(`Made “${copy.name}”`);
  };

  const heading = isIndex
    ? "Dashboards"
    : dashboard
      ? dashboard.builtIn
        ? "Analytics"
        : dashboard.name
      : one.isLoading
        ? "Analytics"
        : "Dashboard not found";

  return (
    <div className="an">
      <header className="an-head">
        <div>
          <h1>{heading}</h1>
          {dashboard?.builtIn ? (
            <p className="an-head__sub">
              Reach, engagement, conversions and retention across every channel.
            </p>
          ) : null}
        </div>
        <span className="an-head__grow" />
        {actions.local ? (
          <span
            className="an-local"
            title="Custom dashboards and links are saved in this browser until the backend stores them."
          >
            <ComputerDesktopIcon aria-hidden="true" />
            Dashboards save in this browser
          </span>
        ) : null}
        {dashboard ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPublishing(true)}
            >
              <GlobeAltIcon aria-hidden="true" />
              Publish
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              disabled={exporting}
            >
              <ArrowDownTrayIcon aria-hidden="true" />
              {exporting ? "Exporting…" : "Export"}
            </Button>
          </>
        ) : null}
      </header>

      <TabBar
        current={dashboard}
        period={period}
        dashboardCount={1 + customCount}
        onPeriod={setPeriod}
        onAddChart={
          dashboard && (dashboard.builtIn || dashboard.charts.length > 0)
            ? openBuilder
            : null
        }
        onNewDashboard={() => setNaming({ mode: "new" })}
        onRename={() =>
          dashboard && setNaming({ mode: "rename", target: dashboard })
        }
        onDelete={() => dashboard && setDeleting(dashboard)}
      />

      {isIndex ? (
        <DashboardsIndex
          dashboards={list.data ?? []}
          onRename={(d) => setNaming({ mode: "rename", target: d })}
          onDuplicate={duplicate}
          onDelete={setDeleting}
        />
      ) : one.isLoading ? (
        <div className="an-bento">
          <Skeleton className="an-bfull h-[84px] rounded-lg" />
          <Skeleton className="an-b2 h-[280px] rounded-lg" />
          <Skeleton className="an-b1 h-[280px] rounded-lg" />
        </div>
      ) : !dashboard ? (
        <div className="an-gone">
          <b>This dashboard does not exist</b>
          <p>It may have been deleted, or it was made in another browser.</p>
          <Button
            variant="outline"
            onClick={() => router.push("/analytics/all")}
          >
            See all dashboards
          </Button>
        </div>
      ) : (
        <DashboardBody
          dashboard={dashboard}
          period={period}
          onAdd={openBuilder}
          onEdit={(spec) => setBuilder({ spec, editing: true })}
        />
      )}

      {builder && dashboard ? (
        <ChartBuilderDialog
          open
          initial={builder.spec}
          editing={builder.editing}
          period={period}
          saving={actions.update.isPending}
          onClose={() => setBuilder(null)}
          onSave={saveChart}
          onRemove={async () => {
            await actions.removeChart(dashboard, builder.spec.id);
            setBuilder(null);
            toast.success("Chart removed");
          }}
        />
      ) : null}
      <NameDialog
        open={naming !== null}
        title={naming?.mode === "rename" ? "Rename dashboard" : "New dashboard"}
        description={
          naming?.mode === "rename"
            ? "Published links keep the name they were created with."
            : "Start empty, then add charts from the same measures as the built-in tabs."
        }
        initial={naming?.mode === "rename" ? naming.target.name : ""}
        confirmLabel={naming?.mode === "rename" ? "Rename" : "Create dashboard"}
        busy={actions.create.isPending || actions.update.isPending}
        onClose={() => setNaming(null)}
        onConfirm={confirmName}
      />
      <DeleteDashboardDialog
        open={deleting !== null}
        name={deleting?.name ?? ""}
        charts={deleting?.chartCount ?? 0}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
      {dashboard ? (
        <PublishDialog
          open={publishing}
          dashboard={dashboard}
          onClose={() => setPublishing(false)}
        />
      ) : null}
    </div>
  );
}

function DashboardBody({
  dashboard,
  period,
  onAdd,
  onEdit,
}: {
  dashboard: Dashboard;
  period: AnalyticsPeriod;
  onAdd: () => void;
  onEdit: (spec: ChartSpec) => void;
}) {
  const own = dashboard.charts.map((c) => (
    <MetricCard
      key={c.id}
      title={c.title}
      meta={describeChart(c)}
      metric={c.metric}
      chart={c.chart}
      period={period}
      own
      onEdit={() => onEdit(c)}
    />
  ));
  return (
    <div className="an-bento">
      {isBuiltIn(dashboard.id) ? (
        <BuiltInCards tab={dashboard.id} period={period} />
      ) : null}
      {own}
      {!dashboard.builtIn && dashboard.charts.length === 0 ? (
        <button type="button" className="an-addchart an-bfull" onClick={onAdd}>
          <span className="an-addchart__ic">
            <PlusIcon aria-hidden="true" />
          </span>
          <span>
            <b>Add a chart</b>
            <span>
              Pick a measure and how to draw it: reach, engagement, conversions,
              audience or on-chain.
            </span>
          </span>
        </button>
      ) : null}
    </div>
  );
}
