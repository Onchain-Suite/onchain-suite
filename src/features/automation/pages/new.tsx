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
import { groupPlaysByFamily, templateReadiness } from "../utils/plays";

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
      toast.error("Loop created but could not open the builder.");
    },
    onError: (err: unknown) => {
      setPending(null);
      toast.error(
        err instanceof Error ? err.message : "Failed to fork this Play"
      );
    },
  });

  const forkPlay = (template: ProtocolTemplate) => {
    setPending(template.id);
    applyMutation.mutate(template);
  };

  const groups = groupPlaysByFamily(protocolTemplates);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <div>
        <Link
          href="/automations"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon aria-hidden="true" className="h-4 w-4" />
          Loops
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
          New Loop
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fork a Protocol Play, or build your own from a trigger. Every Play
          comes with a trigger, timing and copy you can edit.
        </p>
      </div>

      <button
        type="button"
        onClick={() => router.push("/automations/new-id")}
        className="flex w-full items-start gap-4 rounded-2xl border border-border/60 bg-card p-5 text-left transition-colors hover:border-border hover:bg-muted/40"
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

      {groups.map((group) => (
        <section key={group.family.id} className="space-y-3">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-lg">
              {group.family.icon}
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {group.family.label}
              </h2>
              <p className="text-xs text-muted-foreground">
                {group.family.description}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {group.plays.map((play) => {
              const busy = pending === play.id;
              const readiness = templateReadiness(play);
              return (
                <button
                  key={play.id}
                  type="button"
                  disabled={applyMutation.isPending}
                  onClick={() => forkPlay(play)}
                  className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-5 text-left transition-colors hover:border-border hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg">
                      {play.icon}
                    </span>
                    {readiness === "ready" ? (
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Ready to fork
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                        Needs setup
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="block font-semibold text-foreground">
                      {play.name}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                      {busy ? "Forking…" : stepSummary(play.steps)}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-primary">
                    {busy ? "" : "Fork →"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default NewAutomationPage;
