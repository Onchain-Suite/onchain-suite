"use client";

import { PlusIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Tabs, TabsContent } from "@/components/ui/tabs";

import { isJsonObject } from "@/lib/utils";

import {
  automationService,
  type AutomationsStatus,
} from "../automation.service";
// Components
import { ActiveAutomationsList } from "./active";
import { DeleteModal } from "./delete-modal";
import { DraftsList } from "./drafts-list";
import { ProtocolTemplatesList } from "./protocol-templates-list";
import { AutomationStats } from "./stats";
import { AutomationTabs } from "./tabs";
import { TemplatesList } from "./templates-list";
import { Toast } from "./toast";
import {
  buildProtocolAutomation,
  type ProtocolTemplate,
  protocolTemplates,
} from "@/features/automation/data/protocol-templates";
import {
  type Automation,
  type Draft,
  type Template,
} from "@/features/automation/types";
import { PageHeader } from "@/shared/components/page/page-header";
import {
  StatCardsSkeleton,
  TableSkeleton,
} from "@/shared/components/page/page-skeleton";

const asString = (v: unknown): string => (typeof v === "string" ? v : "");
const asNumber = (v: unknown): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const toAutomation = (input: unknown): Automation | null => {
  if (!isJsonObject(input)) return null;
  const a = input as Record<string, unknown>;
  const id =
    asString(a.id) || asString(a.automationId) || asString(a.automation_id);
  if (id.length === 0) return null;
  const status = (asString(a.status) as AutomationsStatus) || "draft";
  const name = asString(a.name) || "Untitled automation";
  const description = asString(a.description);
  const triggerObj = isJsonObject(a.trigger)
    ? (a.trigger as Record<string, unknown>)
    : null;
  const triggerType =
    asString(triggerObj?.type) || asString(a.triggerType) || "onchain";
  const triggerEvent =
    asString(triggerObj?.event) || asString(a.triggerEvent) || "-";
  const triggerContract =
    asString(triggerObj?.contract) || asString(a.triggerContract) || undefined;
  const entries = asNumber(a.entries ?? a.entryCount);
  const conversions = asNumber(a.conversions ?? a.conversionCount);
  const conversionRate =
    asNumber(a.conversionRate ?? a.conversion_rate) ||
    (entries > 0 ? Math.round((conversions / entries) * 1000) / 10 : 0);
  const revenue = asNumber(a.revenue ?? a.revenueUsd ?? a.revenue_usd);
  const lastTriggered =
    asString(a.lastTriggered ?? a.last_triggered ?? a.updatedAt) || "-";
  const createdAt = asString(a.createdAt ?? a.created_at) || "-";

  return {
    id,
    name,
    description,
    trigger: {
      type: triggerType,
      contract: triggerContract,
      event: triggerEvent,
    },
    status:
      status === "paused" ? "paused" : status === "active" ? "active" : "draft",
    entries,
    conversions,
    conversionRate,
    revenue,
    lastTriggered,
    createdAt,
  };
};

const toDraft = (input: unknown): Draft | null => {
  const a = toAutomation(input);
  if (!a) return null;
  if (a.status !== "draft") return null;
  return {
    id: a.id,
    name: a.name,
    description: a.description,
    trigger: a.trigger,
    lastEdited: a.createdAt,
  };
};

const toTemplate = (input: unknown): Template | null => {
  if (!isJsonObject(input)) return null;
  const t = input as Record<string, unknown>;
  const id =
    asString(t.id) || asString(t.templateId) || asString(t.template_id);
  if (id.length === 0) return null;
  return {
    id,
    name: asString(t.name) || asString(t.title) || "Template",
    description: asString(t.description),
    category: asString(t.category) || "template",
    uses: asNumber(t.uses ?? t.useCount ?? t.appliedCount),
  };
};

export const AutomationList = () => {
  const [activeTab, setActiveTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const queryClient = useQueryClient();
  const [deleteModal, setDeleteModal] = useState<{
    show: boolean;
    automation: Automation | null;
  }>({ show: false, automation: null });
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  } | null>(null);

  const normalizedSearch = searchQuery.trim();

  useEffect(() => {
    setPage(1);
  }, [activeTab, normalizedSearch]);

  const countsQuery = useQuery({
    queryKey: ["automations", "counts"],
    queryFn: () => automationService.getCounts(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const metricsQuery = useQuery({
    queryKey: ["automations", "metrics"],
    queryFn: () => automationService.getMetrics(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const itemsQuery = useQuery({
    queryKey: [
      "automations",
      "list",
      { activeTab, page, limit, q: normalizedSearch },
    ],
    queryFn: async () => {
      if (activeTab === "templates") return { items: [], total: 0 };

      if (normalizedSearch.length > 0) {
        const res = await automationService.searchAutomations({
          q: normalizedSearch,
          page,
          limit,
        });
        const root = Array.isArray(res)
          ? res
          : ((res as { items?: unknown[] }).items ?? []);
        const list = Array.isArray(root) ? root : [];
        const filtered =
          activeTab === "drafts"
            ? list.filter((x) => {
                if (!isJsonObject(x)) return false;
                const s = asString((x as Record<string, unknown>).status);
                return s === "draft";
              })
            : list.filter((x) => {
                if (!isJsonObject(x)) return false;
                const s = asString((x as Record<string, unknown>).status);
                return s !== "draft";
              });
        return { items: filtered, total: filtered.length };
      }

      if (activeTab === "drafts") {
        const res = await automationService.listAutomations({
          tab: "drafts",
          page,
          limit,
        });
        const root = Array.isArray(res)
          ? res
          : ((res as { items?: unknown[]; data?: unknown[] }).items ??
            (res as { data?: unknown[] }).data ??
            []);
        const list = Array.isArray(root) ? root : [];
        return { items: list, total: list.length };
      }

      const [activeRes, pausedRes] = await Promise.all([
        automationService.listAutomations({ status: "active", page, limit }),
        automationService.listAutomations({ status: "paused", page, limit }),
      ]);
      const pick = (res: unknown) => {
        const root = Array.isArray(res)
          ? res
          : ((res as { items?: unknown[]; data?: unknown[] }).items ??
            (res as { data?: unknown[] }).data ??
            []);
        return Array.isArray(root) ? root : [];
      };
      const items = [...pick(activeRes), ...pick(pausedRes)];
      return { items, total: items.length };
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const templatesQuery = useQuery({
    queryKey: ["automations", "templates", { q: normalizedSearch }],
    queryFn: async () => {
      const res = await automationService.listTemplates();
      const root = Array.isArray(res)
        ? res
        : ((res as { items?: unknown[] }).items ?? []);
      const list = Array.isArray(root) ? root : [];
      const mapped = list.map(toTemplate).filter((t): t is Template => !!t);
      if (normalizedSearch.length === 0) return mapped;
      return mapped.filter((t) =>
        t.name.toLowerCase().includes(normalizedSearch.toLowerCase())
      );
    },
    enabled: activeTab === "templates",
    retry: false,
    refetchOnWindowFocus: false,
  });

  const automations: Automation[] = useMemo(() => {
    if (activeTab !== "active") return [];
    const items = itemsQuery.data?.items ?? [];
    return items.map(toAutomation).filter((a): a is Automation => !!a);
  }, [activeTab, itemsQuery.data?.items]);

  const drafts: Draft[] = useMemo(() => {
    if (activeTab !== "drafts") return [];
    const items = itemsQuery.data?.items ?? [];
    return items.map(toDraft).filter((d): d is Draft => !!d);
  }, [activeTab, itemsQuery.data?.items]);

  const filteredAutomations = useMemo(() => {
    if (normalizedSearch.length === 0) return automations;
    return automations.filter((a) =>
      a.name.toLowerCase().includes(normalizedSearch.toLowerCase())
    );
  }, [automations, normalizedSearch]);

  const deleteMutation = useMutation({
    mutationFn: async (automationId: string) => {
      await automationService.deleteAutomation(automationId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["automations"] });
      setToast({ show: true, message: "Deleted automation", type: "success" });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to delete";
      setToast({ show: true, message, type: "error" });
      setTimeout(() => setToast(null), 3000);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (automationId: string) => {
      return automationService.duplicateAutomation(automationId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["automations"] });
      setActiveTab("drafts");
      setToast({
        show: true,
        message: "Duplicated automation",
        type: "success",
      });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to duplicate";
      setToast({ show: true, message, type: "error" });
      setTimeout(() => setToast(null), 3000);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (automation: Automation) => {
      const next = automation.status === "active" ? "paused" : "active";
      await automationService.updateAutomationStatus(automation.id, {
        status: next,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["automations"] });
      setToast({ show: true, message: "Updated status", type: "success" });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to update status";
      setToast({ show: true, message, type: "error" });
      setTimeout(() => setToast(null), 3000);
    },
  });

  const applyProtocolTemplateMutation = useMutation({
    mutationFn: async (template: ProtocolTemplate) => {
      const body = buildProtocolAutomation(template, Date.now());
      return automationService.createAutomation(body);
    },
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ["automations"] });
      const automationId =
        typeof (res as { automationId?: unknown }).automationId === "string"
          ? (res as { automationId: string }).automationId
          : null;
      if (automationId) {
        window.location.href = `/automations/${automationId}`;
        return;
      }
      setToast({
        show: true,
        message: "Automation created from template",
        type: "success",
      });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to create from template";
      setToast({ show: true, message, type: "error" });
      setTimeout(() => setToast(null), 3000);
    },
  });

  const applyTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      await automationService.getTemplate(templateId);
      return automationService.applyTemplate(templateId);
    },
    onSuccess: (res) => {
      const automationId =
        typeof (res as { automationId?: unknown }).automationId === "string"
          ? (res as { automationId: string }).automationId
          : null;
      if (automationId) {
        window.location.href = `/automations/${automationId}`;
        return;
      }
      setToast({ show: true, message: "Template applied", type: "success" });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to apply template";
      setToast({ show: true, message, type: "error" });
      setTimeout(() => setToast(null), 3000);
    },
  });

  const stats = {
    active:
      typeof metricsQuery.data?.active === "number"
        ? metricsQuery.data.active
        : filteredAutomations.filter((a) => a.status === "active").length,
    entries:
      typeof metricsQuery.data?.entries === "number"
        ? metricsQuery.data.entries
        : 0,
    conversions:
      typeof metricsQuery.data?.conversions === "number"
        ? metricsQuery.data.conversions
        : 0,
    revenue:
      typeof metricsQuery.data?.revenue === "number"
        ? metricsQuery.data.revenue
        : 0,
  };

  const pageCount = useMemo(() => {
    const total = itemsQuery.data?.total ?? 0;
    return Math.max(1, Math.ceil(Math.max(0, total) / limit));
  }, [itemsQuery.data?.total, limit]);

  const handleDeleteConfirm = async () => {
    const a = deleteModal.automation;
    if (a) {
      deleteMutation.mutate(a.id);
    }
    setDeleteModal({ show: false, automation: null });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Automations"
        description="Trigger personalized flows from your users' onchain signals."
        actions={
          <Link
            href="/automations/new-id"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[0_14px_34px_-16px_rgba(86,112,255,0.9)] transition-all hover:bg-primary/90 hover:shadow-[0_18px_40px_-14px_rgba(86,112,255,1)]"
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            Create automation
          </Link>
        }
      />

      {metricsQuery.isLoading ? (
        <StatCardsSkeleton />
      ) : (
        <AutomationStats stats={stats} />
      )}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <AutomationTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          counts={{
            active:
              typeof countsQuery.data?.active === "number"
                ? countsQuery.data.active
                : stats.active,
            drafts:
              typeof countsQuery.data?.drafts === "number"
                ? countsQuery.data.drafts
                : drafts.length,
            templates:
              (typeof countsQuery.data?.templates === "number"
                ? countsQuery.data.templates
                : (templatesQuery.data?.length ?? 0)) +
              protocolTemplates.length,
          }}
        />

        <TabsContent value="active" className="space-y-4">
          {itemsQuery.isLoading ? (
            <TableSkeleton />
          ) : (
            <ActiveAutomationsList
              automations={filteredAutomations}
              searchQuery={searchQuery}
              onToggleStatus={(automation) =>
                toggleStatusMutation.mutate(automation)
              }
              onDuplicate={(automation) =>
                duplicateMutation.mutate(automation.id)
              }
              onDelete={(automation) =>
                setDeleteModal({ show: true, automation })
              }
            />
          )}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          <DraftsList
            drafts={drafts}
            onDelete={(draft) =>
              setDeleteModal({
                show: true,
                automation: {
                  id: draft.id,
                  name: draft.name,
                  description: draft.description,
                  trigger: draft.trigger,
                  status: "draft",
                  entries: 0,
                  conversions: 0,
                  conversionRate: 0,
                  revenue: 0,
                  lastTriggered: "-",
                  createdAt: draft.lastEdited,
                },
              })
            }
          />
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-8">
          <ProtocolTemplatesList
            onApply={(template) =>
              applyProtocolTemplateMutation.mutate(template)
            }
            applyingId={
              applyProtocolTemplateMutation.isPending
                ? (applyProtocolTemplateMutation.variables?.id ?? null)
                : null
            }
          />
          {(templatesQuery.data?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Saved templates
              </h2>
              <TemplatesList
                templates={templatesQuery.data ?? []}
                onApply={(template) =>
                  applyTemplateMutation.mutate(template.id)
                }
              />
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      <DeleteModal
        show={deleteModal.show}
        automation={deleteModal.automation}
        isDeleting={deleteMutation.isPending}
        onClose={() => setDeleteModal({ show: false, automation: null })}
        onConfirm={handleDeleteConfirm}
      />

      <Toast
        show={!!toast}
        message={toast?.message ?? ""}
        type={toast?.type ?? "success"}
        onClose={() => setToast(null)}
      />
    </div>
  );
};
