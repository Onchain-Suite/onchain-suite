"use client";

import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useCallback } from "react";

import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { Switch } from "@/ui/switch";

import type { CaptureFieldSpec } from "../forms.service";

const FIELD_TYPES: NonNullable<CaptureFieldSpec["type"]>[] = [
  "email",
  "text",
  "wallet",
];

/** Editable list of capture fields (key, label, type, required). Controlled. */
export function FieldsEditor({
  fields,
  onChange,
}: {
  fields: CaptureFieldSpec[];
  onChange: (next: CaptureFieldSpec[]) => void;
}) {
  const update = useCallback(
    (index: number, patch: Partial<CaptureFieldSpec>) => {
      onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
    },
    [fields, onChange]
  );

  const remove = useCallback(
    (index: number) => onChange(fields.filter((_, i) => i !== index)),
    [fields, onChange]
  );

  const add = useCallback(() => {
    const taken = new Set(fields.map((f) => f.key));
    let key = `field_${fields.length + 1}`;
    while (taken.has(key)) key = `${key}_1`;
    onChange([...fields, { key, label: "", type: "text", required: false }]);
  }, [fields, onChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Fields</Label>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <PlusIcon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Add field
        </Button>
      </div>
      {fields.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          No fields - the form defaults to a single email field.
        </p>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div
              key={field.key}
              className="grid grid-cols-2 items-center gap-2 rounded-md border border-border bg-muted/30 p-2 sm:grid-cols-[1fr_1fr_auto_auto_auto]"
            >
              <Input
                aria-label="Field key"
                value={field.key}
                onChange={(e) => update(index, { key: e.target.value })}
                placeholder="key"
                className="h-8 font-mono text-xs"
              />
              <Input
                aria-label="Field label"
                value={field.label ?? ""}
                onChange={(e) => update(index, { label: e.target.value })}
                placeholder="Label"
                className="h-8 text-xs"
              />
              {/* On phones these controls form their own full-width row;
                  from `sm` up they flow back into the single-row grid. */}
              <div className="col-span-2 flex items-center justify-between gap-2 sm:contents">
                <Select
                  value={field.type ?? "text"}
                  onValueChange={(v) =>
                    update(index, { type: v as CaptureFieldSpec["type"] })
                  }
                >
                  <SelectTrigger
                    aria-label="Field type"
                    className="h-8 w-[92px] text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Switch
                    aria-label="Required"
                    checked={field.required ?? false}
                    onCheckedChange={(v) => update(index, { required: v })}
                  />
                  <span className="text-[10px] text-muted-foreground">req</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="h-8 w-8 p-0 text-destructive"
                  aria-label="Remove field"
                >
                  <TrashIcon className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
