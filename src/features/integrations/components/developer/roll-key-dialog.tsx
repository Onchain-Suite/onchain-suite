"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { formatRelativeTime } from "@/lib/date";
import { cn } from "@/lib/utils";

import type {
  DeveloperKey,
  DeveloperKeyWithToken,
} from "../../contracts/developer";
import { developerService } from "../../developer.service";
import { SecretReveal } from "./secret-reveal";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

const DEVELOPER_KEYS = ["developer", "keys"] as const;

/**
 * Issue a replacement key. A leak stops the old key now; a planned rotation
 * keeps it working for a grace period so servers can be redeployed first.
 */
export function RollKeyDialog({
  keyRow,
  onOpenChange,
}: {
  keyRow: DeveloperKey | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"leaked" | "planned">("leaked");
  const [hours, setHours] = useState(24);
  const [revealed, setRevealed] = useState<DeveloperKeyWithToken | null>(null);

  const reset = () => {
    setMode("leaked");
    setHours(24);
    setRevealed(null);
  };

  const mutation = useMutation({
    mutationFn: () => {
      if (!keyRow) throw new Error("No key selected.");
      const expireInHours =
        mode === "leaked" ? 0 : Math.min(168, Math.max(0, hours));
      return developerService.rollKey(keyRow.id, { expireInHours });
    },
    onSuccess: (rolled) => {
      setRevealed(rolled);
      queryClient.invalidateQueries({ queryKey: DEVELOPER_KEYS });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Couldn't roll key."),
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={keyRow !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {revealed ? (
          <>
            <DialogHeader>
              <DialogTitle>Replacement key issued</DialogTitle>
              <DialogDescription>
                {revealed.replaced?.expiresAt
                  ? `The old key stops working ${formatRelativeTime(
                      revealed.replaced.expiresAt
                    )}.`
                  : "The old key has been expired."}
              </DialogDescription>
            </DialogHeader>
            <SecretReveal
              value={revealed.token}
              helper="Deploy this to your servers before the old key expires."
            />
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                Roll {keyRow?.name ? `"${keyRow.name}"` : "key"}
              </DialogTitle>
              <DialogDescription>
                Issue a replacement that inherits this key&apos;s name, scope
                and environment.
              </DialogDescription>
            </DialogHeader>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as "leaked" | "planned")}
              className="gap-2"
            >
              <label
                htmlFor="roll-leaked"
                className={cn(
                  "flex cursor-pointer gap-2 rounded-lg border p-3 text-sm transition-colors",
                  mode === "leaked"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <RadioGroupItem
                  id="roll-leaked"
                  value="leaked"
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">
                    It leaked - stop the old key immediately
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    The current key stops accepting traffic right away.
                  </span>
                </span>
              </label>
              <label
                htmlFor="roll-planned"
                className={cn(
                  "flex cursor-pointer gap-2 rounded-lg border p-3 text-sm transition-colors",
                  mode === "planned"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <RadioGroupItem
                  id="roll-planned"
                  value="planned"
                  className="mt-0.5"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground">
                    Planned rotation - keep the old key working
                  </span>
                  <span className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    Grace period
                    <Input
                      type="number"
                      min={0}
                      max={168}
                      value={hours}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        setHours(
                          Number.isFinite(n)
                            ? Math.min(168, Math.max(0, Math.round(n)))
                            : 0
                        );
                      }}
                      onClick={(e) => e.preventDefault()}
                      disabled={mode !== "planned"}
                      className="h-8 w-20 rounded-lg"
                    />
                    hours (0-168)
                  </span>
                </span>
              </label>
            </RadioGroup>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Rolling…" : "Roll key"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
