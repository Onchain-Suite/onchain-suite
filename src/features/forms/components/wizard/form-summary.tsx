import {
  CheckIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { cn } from "@/lib/utils";

import {
  type FormCaptureType,
  type FormStyleId,
  type FormTemplateId,
  getStyle,
  getTemplate,
} from "../../forms.catalog";
import type { CaptureFieldSpec } from "../../forms.service";

/** Email-reachable if it collects an email; push-reachable if it connects a wallet. */
export function reachFromFields(fields: CaptureFieldSpec[]) {
  return {
    email: fields.some((f) => (f.type ?? "text") === "email"),
    push: fields.some((f) => (f.type ?? "text") === "wallet"),
  };
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">
        {children}
      </dd>
    </div>
  );
}

export function FormSummary({
  name,
  style,
  template,
  type,
  fields,
  listName,
  automationName,
}: {
  name: string;
  style: FormStyleId;
  template: FormTemplateId | null;
  type: FormCaptureType;
  fields: CaptureFieldSpec[];
  listName?: string | null;
  automationName?: string | null;
}) {
  const reach = reachFromFields(fields);
  const tpl = getTemplate(template);

  return (
    <aside className="w-full self-start rounded-2xl border border-border bg-card p-5">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <ClipboardDocumentListIcon
          className="size-4 text-primary"
          aria-hidden="true"
        />
        Form summary
      </div>
      <dl className="divide-y divide-border">
        <Row label="Name">{name.trim() || "Untitled form"}</Row>
        <Row label="Style">{getStyle(style).name}</Row>
        <Row label="Template">
          {tpl ? (
            tpl.name
          ) : (
            <span className="text-muted-foreground">Not selected</span>
          )}
        </Row>
        <Row label="Type">
          {type === "identity" ? "Identity capture" : "Lead capture"}
        </Row>
        <Row label="Fields">{fields.length}</Row>
        <Row label="Makes reachable">
          <span className="flex flex-col items-end gap-1">
            <Reach on={reach.email} label="Email" />
            <Reach on={reach.push} label="Push" />
          </span>
        </Row>
        <Row label="Adds to list">
          {listName ?? <span className="text-muted-foreground">Not set</span>}
        </Row>
        <Row label="Enrols into">
          {automationName ?? (
            <span className="text-muted-foreground">None</span>
          )}
        </Row>
      </dl>
    </aside>
  );
}

function Reach({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs font-medium",
        on ? "text-primary" : "text-muted-foreground"
      )}
    >
      {on ? (
        <CheckIcon className="size-3" aria-hidden="true" />
      ) : (
        <XMarkIcon className="size-3" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}
