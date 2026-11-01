"use client";

import {
  ArrowLeftIcon,
  PlusIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { isJsonObject } from "@/lib/utils";

import { automationService } from "../automation.service";
import { DescribeLoopDialog } from "../components/describe-loop-dialog";
import {
  buildProtocolAutomation,
  type ProtocolTemplate,
  protocolTemplates,
} from "../data/protocol-templates";
import { groupPlaysByFamily } from "../utils/plays";

export function NewAutomationPage() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [describeOpen, setDescribeOpen] = useState(false);

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
          Describe what you want, start from scratch, or fork a ready-made Play.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setDescribeOpen(true)}
          className="flex w-full items-start gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5 text-left transition-colors hover:border-primary/50 hover:bg-primary/10"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <SparklesIcon aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-foreground">
              Describe it
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              Write the flow in a few sentences and get a Loop to adjust.
            </span>
          </span>
        </button>

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
      </div>

      {groups.map((group) => (
        <section key={group.family.id} className="space-y-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.family.label}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {group.family.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.plays.map((play) => {
              const busy = pending === play.id;
              return (
                <button
                  key={play.id}
                  type="button"
                  disabled={applyMutation.isPending}
                  onClick={() => forkPlay(play)}
                  className="flex h-full flex-col gap-3 rounded-2xl border border-border/60 bg-card p-5 text-left transition-colors hover:border-border hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg">
                    {play.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block font-semibold text-foreground">
                      {play.name}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {play.description}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-primary">
                    {busy ? "Forking…" : "Fork →"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <DescribeLoopDialog open={describeOpen} onOpenChange={setDescribeOpen} />
    </div>
  );
}

export default NewAutomationPage;
