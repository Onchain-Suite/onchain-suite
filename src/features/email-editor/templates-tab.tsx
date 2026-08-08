"use client";

import { PlusIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { extractEmailContent, getSelectedOrganizationId } from "@/lib/utils";

import {
  type EmailDocument,
  parseDocument,
  renderDocumentToHtml,
} from "./blocks";
import { EMAIL_TEMPLATES } from "./templates";
import { templatesService } from "@/features/templates/templates.service";

const TEMPLATES_KEY = ["email-editor", "templates", "email"] as const;

/**
 * Templates tab: saved templates loaded from the backend (list + load + save)
 * plus the built-in starters. Loading resolves the stored `content.json` into
 * the block document; saving serializes the current document as a template.
 */
export function TemplatesTab({
  currentDoc,
  onLoad,
}: {
  currentDoc: EmailDocument;
  onLoad: (doc: EmailDocument) => void;
}) {
  const queryClient = useQueryClient();
  const [saveName, setSaveName] = useState("");

  const listQuery = useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: () => templatesService.list({ channel: "email", limit: 50 }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const loadMutation = useMutation({
    mutationFn: async (id: string) => {
      const full = await templatesService.get(id);
      const { json } = extractEmailContent(full);
      const parsed = parseDocument(json);
      if (!parsed) {
        throw new Error(
          "This template uses an older format and can't be opened."
        );
      }
      return parsed;
    },
    onSuccess: (doc) => {
      onLoad(doc);
      toast.success("Template loaded");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't load template"),
  });

  const saveMutation = useMutation({
    mutationFn: (name: string) =>
      templatesService.create({
        name: name.trim(),
        content: {
          channel: "email",
          html: renderDocumentToHtml(currentDoc),
          json: currentDoc,
        },
      }),
    onSuccess: () => {
      setSaveName("");
      toast.success("Saved as template");
      queryClient
        .invalidateQueries({ queryKey: TEMPLATES_KEY })
        .catch(() => undefined);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't save template"),
  });

  const saved = listQuery.data ?? [];

  return (
    <div className="space-y-5">
      {/* Save current as a template */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Save this email
        </p>
        <div className="flex gap-2">
          <Input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Template name"
            className="h-9 rounded-lg"
          />
          <Button
            size="sm"
            className="rounded-lg"
            disabled={!saveName.trim() || saveMutation.isPending}
            onClick={() => {
              if (!getSelectedOrganizationId()) {
                toast.error("Select an organization first.");
                return;
              }
              saveMutation.mutate(saveName);
            }}
          >
            <PlusIcon className="size-4" aria-hidden="true" />
            {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Saved (backend) templates */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Saved templates
        </p>
        {listQuery.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : listQuery.isError ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            Couldn&apos;t reach the template service.
          </p>
        ) : saved.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            No saved templates yet - save this email above to reuse it.
          </p>
        ) : (
          saved.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={loadMutation.isPending}
              onClick={() => loadMutation.mutate(t.id)}
              className="w-full rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 disabled:opacity-60"
            >
              <p className="truncate text-sm font-medium text-foreground">
                {t.name}
              </p>
              {t.updatedAt ? (
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(t.updatedAt).toLocaleDateString()}
                </p>
              ) : null}
            </button>
          ))
        )}
      </div>

      {/* Built-in starters */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Starter templates
        </p>
        {EMAIL_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              onLoad(t.build());
              toast.success("Template loaded");
            }}
            className="w-full rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <p className="text-sm font-medium text-foreground">{t.name}</p>
            <p className="text-xs text-muted-foreground">{t.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
