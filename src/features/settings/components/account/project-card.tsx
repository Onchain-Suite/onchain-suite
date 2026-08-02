"use client";

import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DefinitionGrid, SettingsCard } from "../settings-card";
import { useAccountOrg } from "./use-account-org";
import {
  type ProjectSettingsFormData,
  projectSettingsService,
} from "@/features/settings/project-settings.service";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";

/** Shared query keys so Project + Contracts read one cached fetch. */
export const projectSettingsKey = (orgId: string | null) =>
  ["account", "project-settings", orgId] as const;
export const supportedChainsKey = (orgId: string | null) =>
  ["account", "supported-chains", orgId] as const;

export function ProjectCard() {
  const { organizationId } = useAccountOrg();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const settingsQuery = useQuery({
    queryKey: projectSettingsKey(organizationId),
    enabled: Boolean(organizationId),
    retry: false,
    queryFn: () =>
      projectSettingsService.getProjectSettings(organizationId ?? undefined),
  });

  const chainsQuery = useQuery({
    queryKey: supportedChainsKey(organizationId),
    enabled: Boolean(organizationId),
    retry: false,
    staleTime: 30 * 60 * 1000,
    queryFn: () =>
      projectSettingsService.getSupportedChains(organizationId ?? undefined),
  });

  const settings = settingsQuery.data;
  const chains = useMemo(() => chainsQuery.data ?? [], [chainsQuery.data]);
  const chainLabel = useMemo(() => {
    const map = new Map(chains.map((c) => [c.slug, c.label]));
    return (slug: string) => map.get(slug) ?? slug;
  }, [chains]);

  const [form, setForm] = useState({
    name: "",
    tokenTicker: "",
    email: "",
    primaryChains: [] as string[],
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      name: settings.name ?? "",
      tokenTicker: settings.tokenTicker ?? "",
      email: settings.email ?? "",
      primaryChains: settings.primaryChains ?? [],
    });
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!settings) throw new Error("Project settings not loaded yet");
      const base: ProjectSettingsFormData = {
        ...settings,
        name: form.name.trim(),
        tokenTicker: form.tokenTicker.trim(),
        email: form.email.trim(),
        primaryChains: form.primaryChains,
      };
      return projectSettingsService.saveProjectSettings(
        base,
        organizationId ?? undefined
      );
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(projectSettingsKey(organizationId), saved);
      setEditing(false);
      toast.success("Project settings saved");
    },
    onError: (error: unknown) =>
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings"
      ),
  });

  const toggleChain = (slug: string) =>
    setForm((f) => ({
      ...f,
      primaryChains: f.primaryChains.includes(slug)
        ? f.primaryChains.filter((s) => s !== slug)
        : [...f.primaryChains, slug],
    }));

  const cancel = () => {
    if (settings)
      setForm({
        name: settings.name ?? "",
        tokenTicker: settings.tokenTicker ?? "",
        email: settings.email ?? "",
        primaryChains: settings.primaryChains ?? [],
      });
    setEditing(false);
  };

  const dash = <span className="text-muted-foreground">—</span>;

  return (
    <SettingsCard
      title="Project"
      description="Protocol identity, chains, and billing details"
      action={
        !editing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            disabled={!organizationId || settingsQuery.isLoading}
          >
            <PencilSquareIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
            Edit
          </Button>
        ) : null
      }
    >
      {settingsQuery.isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {["a", "b", "c", "d"].map((k) => (
            <div key={k} className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      ) : editing ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project / protocol name</Label>
              <Input
                id="project-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-ticker">Token ticker</Label>
              <Input
                id="project-ticker"
                value={form.tokenTicker}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tokenTicker: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-email">Billing email</Label>
              <Input
                id="project-email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Primary chains</Label>
            <div className="flex flex-wrap gap-2">
              {chains.map((chain) => {
                const active = form.primaryChains.includes(chain.slug);
                return (
                  <button
                    key={chain.slug}
                    type="button"
                    onClick={() => toggleChain(chain.slug)}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {chain.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={cancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      ) : (
        <DefinitionGrid
          items={[
            { label: "Project / protocol name", value: settings?.name ?? dash },
            { label: "Token ticker", value: settings?.tokenTicker ?? dash },
            {
              label: "Primary chains",
              value:
                settings?.primaryChains && settings.primaryChains.length > 0
                  ? settings.primaryChains.map(chainLabel).join(", ")
                  : dash,
            },
            { label: "Billing email", value: settings?.email ?? dash },
          ]}
        />
      )}
    </SettingsCard>
  );
}

export default ProjectCard;
