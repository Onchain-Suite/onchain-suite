"use client";

import { ArrowLeftIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { isJsonObject } from "@/lib/utils";

import { automationService } from "../automation.service";
import {
  buildProtocolAutomation,
  type ProtocolTemplate,
  protocolTemplates,
  type TemplateStep,
} from "../data/protocol-templates";

/** Compact "connect → wait 1h → welcome email" summary from a template's steps. */
function stepSummary(steps: TemplateStep[]): string {
  const parts: string[] = [];
  for (const step of steps) {
    if (step.kind === "trigger") parts.push(step.label || step.event);
    else if (step.kind === "wait") parts.push(`wait ${step.duration}`);
    else if (step.kind === "email") parts.push(step.label ?? "email");
    else if (step.kind === "branch") parts.push("branch");
  }
  return parts.slice(0, 4).join(" → ");
}

export function NewAutomationPage() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const applyMutation = useMutation({
    mutationFn: async (template: ProtocolTemplate) => {
      const body = buildProtocolAutomation(template, Date.now());
      return automationService.createAutomation(body);
    },
    onSuccess: (res) => {
      const id = isJsonObject(res) ? res.automationId : undefined;
      if (typeof id === "string" && id) {
        router.push(`/automations/${id}`);
        return;
      }
      setPending(null);
      toast.error("Automation created but could not open the builder.");
    },
    onError: (err: unknown) => {
      setPending(null);
      toast.error(
        err instanceof Error ? err.message : "Failed to create from recipe"
      );
    },
  });

  const applyTemplate = (template: ProtocolTemplate) => {
    setPending(template.id);
    applyMutation.mutate(template);
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <div>
        <Link
          href="/automations"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon aria-hidden="true" className="h-4 w-4" />
          Automations
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
          New automation
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start from a proven recipe, or build your own from a trigger.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => router.push("/automations/new-id")}
          className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card p-5 text-left transition-colors hover:border-border hover:bg-muted/40"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <PlusIcon aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-foreground">
              Start from scratch
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              Pick a trigger and build the flow step by step.
            </span>
          </span>
        </button>

        {protocolTemplates.map((template) => {
          const busy = pending === template.id;
          return (
            <button
              key={template.id}
              type="button"
              disabled={applyMutation.isPending}
              onClick={() => applyTemplate(template)}
              className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card p-5 text-left transition-colors hover:border-border hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg">
                {template.icon}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-foreground">
                  {template.name}
                </span>
                <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                  {busy ? "Creating…" : stepSummary(template.steps)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default NewAutomationPage;
