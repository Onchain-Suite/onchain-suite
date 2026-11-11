"use client";

import {
  ArrowLeft02Icon,
  ChartDecreaseIcon,
  CursorMagicSelection01Icon,
  Diamond01Icon,
  GiftIcon,
  Moon02Icon,
  PlusSignIcon,
  SparklesIcon,
  TaskDaily01Icon,
  Undo02Icon,
  Wallet01Icon,
  WavingHand01Icon,
  WorkflowSquare10Icon,
} from "@hugeicons/core-free-icons";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { isJsonObject } from "@/lib/utils";

import { automationService } from "../automation.service";
import { DescribeLoopDialog } from "../components/describe-loop-dialog";
import { LoopStartCard } from "../components/loop-start-card";
import {
  buildProtocolAutomation,
  type ProtocolTemplate,
  protocolTemplates,
} from "../data/protocol-templates";
import { standardLoopSummary } from "../data/standard-loops";
import { groupPlaysByFamily } from "../utils/plays";
import { Icon, type IconSvgElement } from "@/shared/components/common/hugeicon";

/** A line icon per standard Loop; anything new gets the generic one. */
const LOOP_ICON: Record<string, IconSvgElement> = {
  "welcome-series": WavingHand01Icon,
  "new-holder-onboarding": Wallet01Icon,
  "lead-nurture": TaskDaily01Icon,
  "after-a-purchase": GiftIcon,
  "follow-up-on-interest": CursorMagicSelection01Icon,
  "vip-holders": Diamond01Icon,
  "win-back-quiet-wallets": Undo02Icon,
  "save-a-withdrawal": ChartDecreaseIcon,
  "sunset-unengaged": Moon02Icon,
};

const GROUPS = groupPlaysByFamily(protocolTemplates);

/**
 * New Loop (2.7): describe it, start from scratch, or pick one of the standard
 * Loops, grouped by what they are for. Each standard Loop creates a real draft
 * with its steps and emails already written, and opens it in the builder.
 */
export function NewAutomationPage() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [describeOpen, setDescribeOpen] = useState(false);

  const create = useMutation({
    mutationFn: (template: ProtocolTemplate) =>
      automationService.createAutomation(
        buildProtocolAutomation(template, Date.now())
      ),
    onSuccess: (res) => {
      const id = isJsonObject(res) ? res.automationId : undefined;
      if (typeof id === "string" && id) {
        router.push(`/automations/${id}`);
        return;
      }
      setPending(null);
      toast.error("The Loop was created, but the builder could not open it.");
    },
    onError: (err: unknown) => {
      setPending(null);
      toast.error(
        err instanceof Error ? err.message : "Couldn't create the Loop"
      );
    },
  });

  const start = (template: ProtocolTemplate) => {
    // One at a time: a second click would create a second draft.
    if (pending) return;
    setPending(template.id);
    create.mutate(template);
  };

  const busy = pending !== null;

  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-6">
      <Link
        href="/automations"
        className="inline-flex items-center gap-1.5 self-start rounded-sm text-sm text-(--text-secondary) transition-colors hover:text-(--text-primary) focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
      >
        <Icon icon={ArrowLeft02Icon} className="size-4" />
        Loops
      </Link>

      <header className="text-center">
        <h1 className="text-[26px] font-semibold tracking-[-0.4px] text-(--text-primary)">
          New Loop
        </h1>
        <p className="mt-1.5 text-[15px] text-(--text-secondary)">
          Describe it, start from a standard Loop, or build it step by step.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <LoopStartCard
          tone="feature"
          size="large"
          icon={SparklesIcon}
          title="Describe it"
          description="Write the flow in a few sentences and get a Loop to adjust."
          disabled={busy}
          onClick={() => setDescribeOpen(true)}
        />
        <LoopStartCard
          tone="muted"
          size="large"
          icon={PlusSignIcon}
          title="Start from scratch"
          description="Pick how people come in, then add steps with the + where they go."
          disabled={busy}
          onClick={() => router.push("/automations/new-id")}
        />
      </div>

      {GROUPS.map((group) => (
        <section
          key={group.family.id}
          aria-labelledby={`loops-${group.family.id}`}
          className="flex flex-col gap-2.5"
        >
          <h2
            id={`loops-${group.family.id}`}
            className="text-xs font-semibold tracking-[0.3px] text-(--text-tertiary) uppercase"
          >
            {group.family.label}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.plays.map((play) => (
              <LoopStartCard
                key={play.id}
                icon={LOOP_ICON[play.id] ?? WorkflowSquare10Icon}
                title={play.name}
                description={standardLoopSummary(play.id)}
                busy={pending === play.id}
                disabled={busy}
                onClick={() => start(play)}
              />
            ))}
          </div>
        </section>
      ))}

      <DescribeLoopDialog open={describeOpen} onOpenChange={setDescribeOpen} />
    </div>
  );
}

export default NewAutomationPage;
