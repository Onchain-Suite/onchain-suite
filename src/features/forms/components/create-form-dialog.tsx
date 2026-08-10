"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Switch } from "@/ui/switch";

import type { CaptureFieldSpec, CreateFormInput } from "../forms.service";
import { FieldsEditor } from "./fields-editor";
import { FormPreview } from "./form-preview";

const DEFAULT_FIELDS: CaptureFieldSpec[] = [
  { key: "email", label: "Email address", type: "email", required: true },
];

/**
 * Create dialog with a live preview pane - the preview re-renders as the
 * name/fields/ZK settings change, so users see exactly what they'll embed.
 */
export function CreateFormDialog({
  open,
  onOpenChange,
  submitting,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  submitting: boolean;
  onCreate: (input: CreateFormInput) => void;
}) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [origins, setOrigins] = useState("");
  const [zk, setZk] = useState(true);
  const [fields, setFields] = useState<CaptureFieldSpec[]>(DEFAULT_FIELDS);

  const cleanFields = useMemo(
    () => fields.filter((f) => f.key.trim().length > 0),
    [fields]
  );

  const submit = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    onCreate({
      name: name.trim(),
      tag: tag.trim() || undefined,
      zkEnabled: zk,
      fields: cleanFields,
      allowedOrigins: origins
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create capture form</DialogTitle>
          <DialogDescription>
            You&apos;ll get an embeddable snippet and a submit URL. Turn on ZK
            to encrypt captured emails at rest.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-2 md:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="form-name">Name</Label>
              <Input
                id="form-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Newsletter signup"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="form-tag">Tag (optional)</Label>
              <Input
                id="form-tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="newsletter"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="form-origins">Allowed origins (optional)</Label>
              <Input
                id="form-origins"
                value={origins}
                onChange={(e) => setOrigins(e.target.value)}
                placeholder="https://myprotocol.xyz, https://app.myprotocol.xyz"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated. Leave empty to allow any origin.
              </p>
            </div>
            <FieldsEditor fields={fields} onChange={setFields} />
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <Label htmlFor="form-zk">ZK encryption</Label>
                <p className="text-xs text-muted-foreground">
                  Blind-index + encrypt captured emails at rest.
                </p>
              </div>
              <Switch id="form-zk" checked={zk} onCheckedChange={setZk} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Live preview
            </Label>
            <FormPreview name={name} fields={cleanFields} zkEnabled={zk} />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Creating…" : "Create form"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
