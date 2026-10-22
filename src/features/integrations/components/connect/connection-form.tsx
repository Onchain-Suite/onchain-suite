"use client";

import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import type { FormEvent } from "react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { connectionsService } from "../../connections.service";
import type { ConnectionSummary } from "../../contracts/connections";
import { useConnectionMutations } from "../../hooks/use-connections";
import type { ConnectorDef } from "../../types/connectors";
import { missingFields, toCredentials } from "../../utils/connections";

/**
 * Paste-in credentials for one connector, or the OAuth hand-off for the ones
 * that connect by consent. The server verifies with the provider before it
 * answers, so a save can come back "saved but rejected"; `onSaved` gets the
 * connection either way and the status panel explains it.
 */
export function ConnectionForm({
  def,
  orgId,
  onSaved,
  onCancel,
}: {
  def: ConnectorDef;
  orgId: string | null;
  onSaved?: (conn: ConnectionSummary) => void;
  onCancel?: () => void;
}) {
  const formId = useId();
  const { save } = useConnectionMutations();
  const [values, setValues] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);

  if (def.connect === "oauth") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          You&apos;ll sign in to {def.label} and approve read access, then come
          straight back here.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() =>
              window.location.assign(
                connectionsService.oauthAuthorizeUrl(def.id, orgId ?? undefined)
              )
            }
          >
            <ArrowTopRightOnSquareIcon
              aria-hidden="true"
              className="mr-1.5 size-4"
            />
            Continue to {def.label}
          </Button>
          {onCancel ? (
            <Button size="sm" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  const missing = missingFields(def, values);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (missing.length > 0) return;
    save.mutate(
      { connector: def.id, credentials: toCredentials(def, values) },
      {
        onSuccess: (conn) => {
          setValues({});
          setTouched(false);
          onSaved?.(conn);
        },
      }
    );
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      {def.fields.map((f) => {
        const id = `${formId}-${f.key}`;
        const blank = touched && f.required && !(values[f.key] ?? "").trim();
        return (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={id} className="text-xs">
              {f.label}
              {f.required ? null : (
                <span className="ml-1 font-normal text-muted-foreground">
                  optional
                </span>
              )}
            </Label>
            <Input
              id={id}
              type={f.type === "secret" ? "password" : "text"}
              autoComplete="off"
              spellCheck={false}
              placeholder={f.placeholder}
              value={values[f.key] ?? ""}
              aria-invalid={blank || undefined}
              onChange={(e) =>
                setValues((v) => ({ ...v, [f.key]: e.target.value }))
              }
            />
            {f.hint ? (
              <p className="text-xs text-muted-foreground">{f.hint}</p>
            ) : null}
          </div>
        );
      })}

      {def.where ? (
        <p className="text-xs text-muted-foreground">{def.where}</p>
      ) : null}

      {touched && missing.length > 0 ? (
        <p className="text-xs text-destructive">
          Fill in {missing.join(", ")}.
        </p>
      ) : null}
      {save.error ? (
        <p className="text-xs text-destructive">{save.error.message}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={save.isPending}>
          {save.isPending ? `Checking with ${def.label}…` : "Connect"}
        </Button>
        {onCancel ? (
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
