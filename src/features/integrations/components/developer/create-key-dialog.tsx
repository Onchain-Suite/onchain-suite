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

import { cn } from "@/lib/utils";

import type {
  CreateKeyInput,
  DeveloperKeyWithToken,
  KeyScope,
} from "../../contracts/developer";
import { developerService } from "../../developer.service";
import { SecretReveal } from "./secret-reveal";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

/** Every key list, whichever workspace: a new key belongs in all of them. */
const DEVELOPER_KEYS = ["developer", "keys"] as const;

/** Create a secret key. The full token is shown once, then never again. */
export function CreateKeyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [environment, setEnvironment] =
    useState<CreateKeyInput["environment"]>("test");
  const [name, setName] = useState("");
  const [scope, setScope] = useState<KeyScope>("read_write");
  const [revealed, setRevealed] = useState<DeveloperKeyWithToken | null>(null);

  const reset = () => {
    setEnvironment("test");
    setName("");
    setScope("read_write");
    setRevealed(null);
  };

  const mutation = useMutation({
    mutationFn: () =>
      developerService.createKey({
        environment,
        name: name.trim() || undefined,
        scope,
      }),
    onSuccess: (created) => {
      setRevealed(created);
      queryClient.invalidateQueries({ queryKey: DEVELOPER_KEYS });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Couldn't create key."),
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {revealed ? (
          <>
            <DialogHeader>
              <DialogTitle>Secret key created</DialogTitle>
              <DialogDescription>
                Store it in your server config now.
              </DialogDescription>
            </DialogHeader>
            <SecretReveal
              value={revealed.token}
              helper="Use it as a bearer token: Authorization: Bearer <token>. Never ship it in browser code."
            />
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create secret key</DialogTitle>
              <DialogDescription>
                A server-side credential. It grants full API access - keep it
                out of frontend code.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="create-key-name">Name (optional)</Label>
                <Input
                  id="create-key-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. production-server"
                  className="h-9 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label>Environment</Label>
                <RadioGroup
                  value={environment}
                  onValueChange={(v) =>
                    setEnvironment(v as CreateKeyInput["environment"])
                  }
                  className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                >
                  {(
                    [
                      {
                        value: "test",
                        title: "Test",
                        desc: "POST /events dry-runs. Safe against production data.",
                      },
                      {
                        value: "live",
                        title: "Live",
                        desc: "Events fire automations and really send.",
                      },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      htmlFor={`env-${opt.value}`}
                      className={cn(
                        "flex cursor-pointer gap-2 rounded-lg border p-3 text-sm transition-colors",
                        environment === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <RadioGroupItem
                        id={`env-${opt.value}`}
                        value={opt.value}
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium text-foreground">
                          {opt.title}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {opt.desc}
                        </span>
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Scope</Label>
                <RadioGroup
                  value={scope}
                  onValueChange={(v) => setScope(v as KeyScope)}
                  className="grid grid-cols-2 gap-2"
                >
                  {(
                    [
                      { value: "read_write", title: "Read and write" },
                      { value: "read_only", title: "Read only" },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      htmlFor={`scope-${opt.value}`}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors",
                        scope === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <RadioGroupItem
                        id={`scope-${opt.value}`}
                        value={opt.value}
                      />
                      <span className="font-medium text-foreground">
                        {opt.title}
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </div>
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
                {mutation.isPending ? "Creating…" : "Create key"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
