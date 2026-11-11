"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { ChainRef } from "../../contracts/resolve-contract";
import { onboardingService } from "../../onboarding.service";
import { Icon } from "@/shared/components/common/hugeicon";

/**
 * "My contract is on a chain that is not in your list." The person says which,
 * and one of two things is true: we do index it under another name (an alias,
 * a chain id), in which case `onSupported` hands the real chain back and the
 * address is read there; or we do not, and the ask is kept on the workspace as
 * the signal for which chain to add next. Either way they are told which, and
 * that setup carries on without it.
 */
export function ChainRequestForm({
  address,
  onSupported,
  onRecorded,
}: {
  /** The address they were trying to add, sent along when it is a valid one. */
  address: string | null;
  onSupported: (chain: ChainRef) => void;
  /**
   * The chain is one we do not index. They have just said the contract is
   * there, so whatever chain was selected for it must be let go: the note
   * below says setup carries on without a contract, and it has to be true.
   */
  onRecorded: () => void;
}) {
  const id = useId();
  const [chain, setChain] = useState("");
  const name = chain.trim();

  const ask = useMutation({
    mutationFn: () =>
      onboardingService.requestChain({
        chain: name,
        ...(address ? { address } : {}),
      }),
    onSuccess: (result) => {
      if (result.recorded) onRecorded();
      else onSupported(result.supported);
    },
  });

  if (ask.data?.recorded) {
    return (
      <p
        role="status"
        className="flex items-start gap-2 rounded-lg bg-(--status-success-bg) px-3 py-2.5 text-xs leading-relaxed text-(--status-success-text)"
      >
        <Icon icon={CheckmarkCircle02Icon} className="mt-0.5 size-4 shrink-0" />
        <span>
          Noted: {ask.data.chain}. We do not index it yet, and we will email you
          when we do. You can carry on without a contract: lists, forms and
          sending all work without one.
        </span>
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-(--border-subtle) p-3">
      <Label htmlFor={id}>Which chain is it on?</Label>
      <div className="flex items-start gap-2">
        <Input
          id={id}
          value={chain}
          maxLength={80}
          autoComplete="off"
          onChange={(e) => {
            setChain(e.target.value);
            if (ask.isError || ask.data) ask.reset();
          }}
          onKeyDown={(e) => {
            // Enter here sends the chain; it must not move the wizard on.
            if (e.key !== "Enter") return;
            e.preventDefault();
            e.stopPropagation();
            if (name && !ask.isPending) ask.mutate();
          }}
          placeholder="Its name, chain ID or explorer"
          aria-describedby={`${id}-help`}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          disabled={!name || ask.isPending}
          onClick={() => ask.mutate()}
        >
          {ask.isPending ? "Sending…" : "Tell us"}
        </Button>
      </div>
      <p id={`${id}-help`} className="text-muted-foreground text-xs">
        {ask.isError
          ? "That did not go through. Try again, or carry on and tell us later."
          : ask.data && !ask.data.recorded
            ? `We do index ${ask.data.supported.chainLabel}. Reading the address there.`
            : "We use it to decide which chain to add next, and email you when yours is in."}
      </p>
    </div>
  );
}
