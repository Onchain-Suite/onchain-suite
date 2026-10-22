"use client";

import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";

import {
  explainTelegramError,
  telegramService,
} from "@/features/settings/telegram.service";

/**
 * Point the connected bot at our webhook so people who press Start on it are
 * recorded as opted in. Idempotent, so it is safe to run again after replacing
 * the token.
 */
export function TelegramActivate() {
  const activate = useMutation({
    mutationFn: () => telegramService.activate(),
  });

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Telegram can&apos;t message anyone first. Turn on opt-ins so a person
        who starts your bot can be reached from then on.
      </p>
      {activate.isSuccess ? (
        <p className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircleIcon aria-hidden="true" className="size-4" />
          Opt-ins are on.
        </p>
      ) : (
        <Button
          size="sm"
          onClick={() => activate.mutate()}
          disabled={activate.isPending}
        >
          {activate.isPending ? "Turning on…" : "Turn on opt-ins"}
        </Button>
      )}
      {activate.error ? (
        <p className="text-xs text-destructive">
          {explainTelegramError(activate.error.message) ??
            activate.error.message}
        </p>
      ) : null}
    </div>
  );
}
