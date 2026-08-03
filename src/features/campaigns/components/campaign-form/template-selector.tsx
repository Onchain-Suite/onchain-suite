"use client";

import {
  ArrowPathIcon,
  CheckIcon,
  DocumentDuplicateIcon,
  EllipsisVerticalIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  PaperClipIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  Squares2X2Icon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";

import {
  cn,
  extractEmailContent,
  getSelectedOrganizationId,
  isJsonObject,
} from "@/lib/utils";

import type { CampaignFormData } from "../../validations";
import {
  buildTemplateSeedPayload,
  LIBRARY_EMAIL_TEMPLATES,
  type LibraryEmailTemplate,
} from "@/features/templates/library-templates";
import {
  ONCHAIN_VARIABLE_SAMPLES,
  renderMergeTags,
} from "@/features/templates/onchain-variables";
import {
  type TemplateItem,
  templatesService,
} from "@/features/templates/templates.service";

interface TemplateSelectorProps {
  form: UseFormReturn<CampaignFormData>;
  /** Campaign delivery channel — push campaigns default to push templates. */
  channel?: "email" | "in-app-push";
  onCreateEditor?: (opts?: { templateName?: string }) => void;
  onSelectTemplate?: (templateId: string) => void;
  onEditTemplate?: (templateId: string, templateName: string) => void;
  onUseTemplate?: (templateId: string, templateName: string) => void;
}

type SortMode = "used" | "recent" | "oldest" | "name";
type TabMode = "library" | "saved";
type ChannelFilter = "email" | "inapp";

type TemplateRow = {
  raw: TemplateItem;
  id: string;
  title: string;
  updatedAtMs: number;
  date: string;
  preview: string;
};

const RECENTS_KEY = "onchain.templates.recents.v1";

const readRecents = (): Record<string, number> => {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(RECENTS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const entries = Object.entries(parsed as Record<string, unknown>);
    const out: Record<string, number> = {};
    for (const [k, v] of entries) {
      if (typeof k !== "string" || k.trim().length === 0) continue;
      if (typeof v !== "number" || !Number.isFinite(v)) continue;
      out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
};

const writeRecents = (recents: Record<string, number>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
  window.dispatchEvent(new Event("onchain:templates-recents"));
};

/**
 * Renders an email's HTML as a thumbnail that always fills its card. The email
 * is laid out at a fixed 600px design width inside an iframe, then scaled by
 * (container width / 600) via a ResizeObserver — so the preview fits any card
 * size instead of overflowing/underflowing a hard-coded scale.
 */
function TemplateThumb({ html, title }: { html: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const BASE = 600;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / BASE);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden bg-white">
      <iframe
        title={title}
        sandbox="allow-same-origin"
        srcDoc={html}
        className="origin-top-left border-0"
        style={{
          width: "600px",
          height: "750px",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
        loading="lazy"
      />
    </div>
  );
}

function TemplatesEmptyState({
  title,
  description,
  onCreate,
}: {
  title: string;
  description: string;
  onCreate?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
      <PaperClipIcon
        className="mx-auto h-8 w-8 text-muted-foreground"
        aria-hidden="true"
      />
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      {onCreate ? (
        <div className="mt-6 flex w-full max-w-xs">
          <Button
            type="button"
            onClick={onCreate}
            className="w-full rounded-xl"
          >
            <PlusIcon className="mr-2 h-4 w-4" aria-hidden="true" />
            Create first template
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function TemplateSelector({
  form,
  channel,
  onCreateEditor,
  onSelectTemplate,
  onEditTemplate,
  onUseTemplate,
}: TemplateSelectorProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [tab, setTab] = useState<TabMode>("library");
  const [sortMode, setSortMode] = useState<SortMode>("used");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>(
    channel === "in-app-push" ? "inapp" : "email"
  );
  const [templateSearch, setTemplateSearch] = useState("");
  const [recents, setRecents] = useState<Record<string, number>>({});
  const [htmlCache, setHtmlCache] = useState<Record<string, string>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTitle, setDeleteTitle] = useState("");
  const orgId = getSelectedOrganizationId();

  const selectedTemplate = form.watch("selectedTemplate");
  const templatesQuery = useQuery({
    queryKey: [
      "templates",
      "list",
      orgId,
      tab,
      templateSearch,
      sortMode,
      channelFilter,
    ],
    queryFn: () =>
      templatesService.list(
        {
          ...(templateSearch.trim().length > 0
            ? { search: templateSearch.trim() }
            : {}),
          sort: sortMode,
          folder: tab === "saved" ? "saved" : undefined,
          channel: channelFilter,
          limit: 50,
        },
        orgId ?? undefined
      ),
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  });

  useEffect(() => {
    const onUpdate = () => templatesQuery.refetch();
    window.addEventListener("onchain:templates-updated", onUpdate);
    return () =>
      window.removeEventListener("onchain:templates-updated", onUpdate);
  }, [templatesQuery]);

  useEffect(() => {
    setRecents(readRecents());
    const onUpdate = () => setRecents(readRecents());
    window.addEventListener("storage", onUpdate);
    window.addEventListener("onchain:templates-recents", onUpdate);
    return () => {
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("onchain:templates-recents", onUpdate);
    };
  }, []);

  const extractTemplateName = (raw: unknown): string => {
    const obj = isJsonObject(raw) ? raw : {};
    const name = obj.name ?? obj.title ?? "Untitled";
    return typeof name === "string" && name.trim().length > 0
      ? name.trim()
      : "Untitled";
  };

  const extractUpdatedAtMs = (raw: unknown): number => {
    const obj = isJsonObject(raw) ? raw : {};
    const updatedAt = obj.updatedAt ?? obj.createdAt ?? null;
    if (typeof updatedAt !== "string" || updatedAt.trim().length === 0)
      return 0;
    const ms = new Date(updatedAt).getTime();
    return Number.isFinite(ms) ? ms : 0;
  };

  const extractPreviewUrl = (raw: unknown): string => {
    return extractEmailContent(raw).previewUrl ?? "";
  };

  const formatTemplateDate = (raw: unknown): string => {
    const obj = isJsonObject(raw) ? raw : {};
    const updatedAt = obj.updatedAt ?? obj.createdAt ?? null;
    if (typeof updatedAt !== "string" || updatedAt.trim().length === 0) {
      return "Saved";
    }
    const dt = new Date(updatedAt);
    if (Number.isNaN(dt.getTime())) return "Saved";
    return dt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const extractHtmlFromTemplate = (raw: unknown): string => {
    return extractEmailContent(raw).html ?? "";
  };

  const templates = useMemo<TemplateRow[]>(() => {
    if (!templatesQuery.isSuccess) return [];
    if (!Array.isArray(templatesQuery.data)) return [];

    const mapped: TemplateRow[] = templatesQuery.data
      .filter((t): t is TemplateItem => Boolean(t && typeof t.id === "string"))
      .map((t) => ({
        raw: t,
        id: t.id,
        title: extractTemplateName(t),
        updatedAtMs: extractUpdatedAtMs(t),
        date: formatTemplateDate(t),
        preview: extractPreviewUrl(t),
      }))
      .filter((t) => t.id.trim().length > 0);

    const byId = new Map(mapped.map((t) => [t.id, t]));

    if (sortMode === "used") {
      const usedSorted = Object.entries(recents)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => byId.get(id))
        .filter((t): t is TemplateRow => Boolean(t));
      const remaining = mapped
        .filter((t) => !recents[t.id])
        .sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      return [...usedSorted, ...remaining];
    }

    if (sortMode === "name") {
      return mapped.sort((a, b) => a.title.localeCompare(b.title));
    }

    if (sortMode === "oldest") {
      return mapped.sort((a, b) => a.updatedAtMs - b.updatedAtMs);
    }

    return mapped.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
  }, [recents, sortMode, templatesQuery.data, templatesQuery.isSuccess]);

  const markTemplateUsed = (templateId: string) => {
    const next = { ...readRecents(), [templateId]: Date.now() };
    writeRecents(next);
    setRecents(next);
  };

  const renameMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string }) => {
      return templatesService.update(
        payload.id,
        { name: payload.name },
        orgId ?? undefined
      );
    },
    onSuccess: () => {
      window.dispatchEvent(new Event("onchain:templates-updated"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await templatesService.remove(id, orgId ?? undefined);
      return id;
    },
    onSuccess: () => {
      toast.success("Template deleted.");
      window.dispatchEvent(new Event("onchain:templates-updated"));
      templatesQuery.refetch();
    },
    onError: (e) => {
      toast.error(
        e instanceof Error ? e.message : "Failed to delete template."
      );
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) =>
      templatesService.duplicate(id, orgId ?? undefined),
    onSuccess: () => {
      toast.success("Template duplicated.");
      window.dispatchEvent(new Event("onchain:templates-updated"));
      setTab("saved");
      templatesQuery.refetch();
    },
    onError: (e) => {
      toast.error(
        e instanceof Error ? e.message : "Failed to duplicate template."
      );
    },
  });

  // "Use" a built-in starter template: create it in the workspace so it becomes
  // a real, sendable template, then select it for this campaign.
  const useStarterMutation = useMutation({
    mutationFn: async (tpl: LibraryEmailTemplate) => {
      const created = await templatesService.create(
        buildTemplateSeedPayload(tpl),
        orgId ?? undefined
      );
      return { created, tpl };
    },
    onSuccess: ({ created, tpl }) => {
      const id = String(created?.id ?? "");
      window.dispatchEvent(new Event("onchain:templates-updated"));
      templatesQuery.refetch();
      if (id.length > 0) {
        markTemplateUsed(id);
        form.setValue("selectedTemplate", id);
        if (onUseTemplate) {
          onUseTemplate(id, tpl.name);
          return;
        }
        onSelectTemplate?.(id);
      }
      toast.success("Template added and applied to your campaign.");
    },
    onError: (e) => {
      toast.error(
        e instanceof Error ? e.message : "Couldn't use this template."
      );
    },
  });

  const openLibraryPreview = (template: { title: string; html: string }) => {
    setPreviewTitle(template.title);
    setPreviewHtml(renderMergeTags(template.html, ONCHAIN_VARIABLE_SAMPLES));
    setPreviewLoading(false);
    setPreviewOpen(true);
  };

  const openPreview = async (template: { id: string; title: string }) => {
    setPreviewTitle(template.title);
    setPreviewHtml("");
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const full = await templatesService.get(template.id, orgId ?? undefined);
      const html = extractHtmlFromTemplate(full);
      setPreviewHtml(html);
      setHtmlCache((prev) =>
        html.length > 0 ? { ...prev, [template.id]: html } : prev
      );
    } catch {
      setPreviewHtml("");
    } finally {
      setPreviewLoading(false);
    }
  };

  const ensureHtmlCached = async (template: { id: string; raw: unknown }) => {
    if (htmlCache[template.id]) return;
    const fromRaw = extractHtmlFromTemplate(template.raw);
    if (fromRaw.trim().length > 0) {
      setHtmlCache((prev) => ({ ...prev, [template.id]: fromRaw }));
      return;
    }
    try {
      const full = await templatesService.get(template.id, orgId ?? undefined);
      const html = extractHtmlFromTemplate(full);
      if (html.trim().length > 0) {
        setHtmlCache((prev) => ({ ...prev, [template.id]: html }));
      }
    } catch {
      String("");
    }
  };

  return (
    <div className="space-y-6 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20">
            <Squares2X2Icon aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-semibold leading-tight text-foreground">
              Templates
            </h2>
            <p className="text-xs text-muted-foreground">
              Pick a design or craft your own
            </p>
          </div>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
          <Button
            type="button"
            onClick={() => {
              const suggested = String(
                form.getValues("emailSubject") ?? ""
              ).trim();
              setCreateName(suggested);
              setCreateOpen(true);
            }}
            className="rounded-xl bg-primary text-primary-foreground shadow-sm transition-all duration-300 hover:bg-primary/90"
          >
            <PlusIcon aria-hidden="true" className="h-4 w-4" />
            Create
          </Button>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TabMode)}
        className="w-full"
      >
        <TabsList className="bg-muted rounded-xl p-1 w-fit">
          <TabsTrigger
            value="library"
            className="rounded-lg data-[state=active]:bg-background"
          >
            Email Library
          </TabsTrigger>
          <TabsTrigger
            value="saved"
            className="rounded-lg data-[state=active]:bg-background"
          >
            Email Saved
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full flex-1">
          <MagnifyingGlassIcon
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
          <Input
            placeholder="Search"
            value={templateSearch}
            onChange={(e) => setTemplateSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl border-border bg-background transition-all duration-300"
          />
        </div>
        <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:flex-nowrap sm:justify-end sm:gap-3">
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
              className={cn(
                "h-8 w-8 rounded-lg transition-all duration-300",
                viewMode === "grid" && "bg-background shadow-sm"
              )}
            >
              <Squares2X2Icon aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("list")}
              aria-label="List view"
              className={cn(
                "h-8 w-8 rounded-lg transition-all duration-300",
                viewMode === "list" && "bg-background shadow-sm"
              )}
            >
              <ListBulletIcon aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
          <Select
            value={channelFilter}
            onValueChange={(v) => setChannelFilter(v as ChannelFilter)}
          >
            <SelectTrigger className="h-10 w-[150px] rounded-xl border-border bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="email">Email templates</SelectItem>
              <SelectItem value="inapp">Push templates</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortMode}
            onValueChange={(v) => setSortMode(v as SortMode)}
          >
            <SelectTrigger className="h-10 w-[190px] rounded-xl border-border bg-background sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="used">Used most recently</SelectItem>
              <SelectItem value="recent">Edited most recently</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {templatesQuery.isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading templates...
        </div>
      ) : templatesQuery.isError ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <div className="text-sm text-muted-foreground">
            Failed to load templates.
          </div>
          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => templatesQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : templates.length === 0 ? (
        templateSearch.trim().length > 0 ? (
          <TemplatesEmptyState
            title="No templates match your search"
            description="Try a different keyword or clear the search to see all templates."
          />
        ) : tab === "library" ? (
          <div className="space-y-5">
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
              <div className="relative flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
                  <SparklesIcon aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    World-class starter templates
                  </h3>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                    {LIBRARY_EMAIL_TEMPLATES.length} production-ready, on-brand
                    emails built for onchain protocols — each with dynamic
                    variables baked in. Preview any design below to get started.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {LIBRARY_EMAIL_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="group overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-muted-foreground/30 hover:shadow-lg"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-white">
                    <TemplateThumb
                      html={renderMergeTags(tpl.html, ONCHAIN_VARIABLE_SAMPLES)}
                      title={`Starter template ${tpl.name}`}
                    />
                    <span className="absolute right-3 top-3 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-medium text-primary-foreground shadow-sm">
                      {tpl.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 border-t border-border px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {tpl.name}
                      </h3>
                      <p className="truncate text-xs text-muted-foreground">
                        {tpl.description}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 rounded-lg"
                          aria-label={`Options for ${tpl.name}`}
                        >
                          <EllipsisVerticalIcon
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            openLibraryPreview({
                              title: tpl.name,
                              html: tpl.html,
                            })
                          }
                        >
                          <MagnifyingGlassIcon
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={useStarterMutation.isPending}
                          onClick={() => useStarterMutation.mutate(tpl)}
                        >
                          <CheckIcon aria-hidden="true" className="h-4 w-4" />
                          Use template
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <TemplatesEmptyState
            title="No saved templates yet"
            description="Create your first template to reuse it across campaigns."
            onCreate={onCreateEditor}
          />
        )
      ) : (
        <div
          className={cn(
            "transition-all duration-300",
            viewMode === "grid"
              ? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
              : "flex flex-col gap-1.5"
          )}
        >
          {templates.map((temp) => {
            const isList = viewMode === "list";
            const isSelected = selectedTemplate === temp.id;
            const select = () => {
              markTemplateUsed(temp.id);
              form.setValue("selectedTemplate", temp.id);
              onSelectTemplate?.(temp.id);
            };
            const menu = (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "shrink-0 rounded-lg",
                      isList ? "h-7 w-7" : "h-8 w-8"
                    )}
                    aria-label="Template options"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <EllipsisVerticalIcon
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      openPreview({ id: temp.id, title: temp.title });
                    }}
                  >
                    <MagnifyingGlassIcon
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                    Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      markTemplateUsed(temp.id);
                      if (onUseTemplate) {
                        onUseTemplate(temp.id, temp.title);
                      } else {
                        select();
                        toast.success("Template applied to your campaign.");
                      }
                    }}
                  >
                    <CheckIcon aria-hidden="true" className="h-4 w-4" />
                    Use template
                  </DropdownMenuItem>
                  {tab === "saved" ? (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTemplate?.(temp.id, temp.title);
                        }}
                      >
                        <PencilIcon aria-hidden="true" className="h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateMutation.mutate(temp.id);
                        }}
                      >
                        <DocumentDuplicateIcon
                          aria-hidden="true"
                          className="h-4 w-4"
                        />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameId(temp.id);
                          setRenameValue(temp.title);
                          setRenameOpen(true);
                        }}
                      >
                        <PencilIcon aria-hidden="true" className="h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(temp.id);
                          setDeleteTitle(temp.title);
                          setDeleteOpen(true);
                        }}
                      >
                        <TrashIcon aria-hidden="true" className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            );

            if (isList) {
              return (
                <div
                  key={temp.id}
                  onClick={select}
                  onMouseEnter={() => {
                    if (!temp.preview) ensureHtmlCached(temp);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      select();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "group flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-1.5 transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/40"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold uppercase",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {temp.title.trim().charAt(0) || "T"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {temp.title}
                  </span>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                    {temp.date}
                  </span>
                  {isSelected ? (
                    <CheckIcon
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-primary"
                    />
                  ) : null}
                  {menu}
                </div>
              );
            }

            return (
              <div
                key={temp.id}
                onClick={select}
                onMouseEnter={() => {
                  if (!temp.preview) ensureHtmlCached(temp);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    select();
                  }
                }}
                role="button"
                tabIndex={0}
                className={cn(
                  "group cursor-pointer overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:shadow-lg",
                  isSelected
                    ? "border-primary shadow-lg ring-2 ring-primary/20"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                  {temp.preview ? (
                    <Image
                      src={temp.preview || "/placeholder.svg"}
                      alt={temp.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                  ) : htmlCache[temp.id] ? (
                    <TemplateThumb
                      html={htmlCache[temp.id]}
                      title={`Template preview ${temp.title}`}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                      Preview
                    </div>
                  )}
                  {isSelected ? (
                    <div className="absolute top-3 right-3 bg-primary rounded-full p-1.5 shadow-lg">
                      <CheckIcon
                        aria-hidden="true"
                        className="h-4 w-4 text-primary-foreground"
                      />
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 border-t border-border px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-foreground">
                      {temp.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">{temp.date}</p>
                  </div>
                  {menu}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewTitle || "Template preview"}</DialogTitle>
          </DialogHeader>
          <div className="h-[70vh] overflow-hidden rounded-xl border border-border bg-white">
            {previewLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <ArrowPathIcon
                  aria-hidden="true"
                  className="mr-2 h-4 w-4 animate-spin"
                />
                Loading preview…
              </div>
            ) : previewHtml.trim().length > 0 ? (
              <iframe
                title="Template HTML preview"
                sandbox="allow-same-origin allow-scripts"
                srcDoc={previewHtml}
                className="h-full w-full"
                style={{ border: "none" }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No preview available.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete template</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete{" "}
            <span className="font-medium text-foreground">
              {deleteTitle || "this template"}
            </span>
            ? This can&apos;t be undone.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              disabled={!deleteId || deleteMutation.isPending}
              onClick={() => {
                if (!deleteId) return;
                deleteMutation.mutate(deleteId, {
                  onSuccess: () => {
                    setDeleteOpen(false);
                    setDeleteId(null);
                  },
                });
              }}
            >
              {deleteMutation.isPending ? (
                <ArrowPathIcon
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin"
                />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Name your template</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">
              Template name
            </div>
            <Input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. Welcome series – Email 1"
              className="h-10 rounded-xl bg-background"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={!onCreateEditor || createName.trim().length === 0}
              onClick={() => {
                const name = createName.trim();
                setCreateOpen(false);
                onCreateEditor?.({ templateName: name });
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename template</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">
              Template name
            </div>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="h-10 rounded-xl bg-background"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setRenameOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={
                !renameId ||
                renameValue.trim().length === 0 ||
                renameMutation.isPending
              }
              onClick={() => {
                if (!renameId) return;
                const nextName = renameValue.trim();
                renameMutation.mutate(
                  { id: renameId, name: nextName },
                  {
                    onSuccess: () => {
                      setRenameOpen(false);
                      setRenameId(null);
                    },
                  }
                );
              }}
            >
              {renameMutation.isPending ? (
                <ArrowPathIcon
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin"
                />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
