"use client";

import { SparklesIcon } from "@heroicons/react/24/outline";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { isJsonObject } from "@/lib/utils";

import { automationService } from "../automation.service";
import {
  buildProtocolAutomation,
  type ProtocolTemplate,
} from "../data/protocol-templates";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

const EXAMPLES = [
  "When a wallet buys my token, wait an hour then send a thank-you email, and three days later a tips email.",
  "When someone joins my newsletter list, send a welcome, then a getting-started email two days later.",
  "When a holder goes quiet for a while, send a we-miss-you email, then an incentive five days later.",
];

/**
 * "Describe it": a natural-language box that calls the AI endpoint
 * (`POST /automations/describe`), turns the returned step DSL into a draft
 * Loop with the SAME `buildProtocolAutomation` builder the Plays use, creates
 * it, and opens the builder. The AI only ever emits real runtime triggers
 * (validated server-side); any field it can't fill is left blank for the user.
 */
export function DescribeLoopDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  const describe = useMutation({
    mutationFn: async (text: string) => {
      const described = await automationService.describeAutomation(text);
      const aiTemplate: ProtocolTemplate = {
        id: "ai-described",
        family: "welcome-onboard",
        name: described.name || "Untitled Loop",
        description: described.description || "",
        icon: "✨",
        estimatedReach: 0,
        uses: 0,
        tags: [],
        steps: described.steps,
      };
      const body = buildProtocolAutomation(aiTemplate, Date.now());
      return automationService.createAutomation(body);
    },
    onSuccess: (res) => {
      const id = isJsonObject(res) ? res.automationId : undefined;
      if (typeof id === "string" && id) {
        router.push(`/automations/${id}`);
        return;
      }
      toast.error("Loop created but could not open the builder.");
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Couldn't turn that into a Loop. Try rephrasing."
      );
    },
  });

  const trimmed = prompt.trim();
  const busy = describe.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon aria-hidden="true" className="h-5 w-5 text-primary" />
            Describe your Loop
          </DialogTitle>
          <DialogDescription>
            Write the flow in a sentence or two. We will draft the trigger,
            timing and emails for you to adjust before anything goes live.
          </DialogDescription>
        </DialogHeader>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. When a wallet buys my token, wait an hour then send a thank-you email…"
          aria-label="Describe your Loop"
          rows={4}
          maxLength={1000}
          disabled={busy}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
        />

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Try one of these
          </p>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              disabled={busy}
              onClick={() => setPrompt(example)}
              className="block w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground disabled:opacity-60"
            >
              {example}
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={!trimmed || busy}
            onClick={() => describe.mutate(trimmed)}
          >
            {busy ? "Drafting…" : "Draft my Loop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
