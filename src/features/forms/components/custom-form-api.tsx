"use client";

import {
  CheckIcon,
  ClipboardIcon,
  CodeBracketIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/ui/button";
import { Label } from "@/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";

import type { CaptureFieldSpec } from "../forms.service";
import {
  buildCurlExample,
  buildFetchExample,
  submittableFields,
} from "../utils/custom-form-snippet";

/** A scrollable, theme-token code block. */
function CodeArea({ code }: { code: string }) {
  return (
    <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-muted/40 p-3.5 font-mono text-xs leading-6 text-foreground">
      <code>{code}</code>
    </pre>
  );
}

/** A labeled code block with a copy button, matching the embed-snippet style. */
function CodeBlock({
  id,
  label,
  code,
  copyValue,
  copied,
  onCopy,
}: {
  id: string;
  label: string;
  code: string;
  /** What the copy button writes; defaults to `code`. */
  copyValue?: string;
  copied: string | null;
  onCopy: (id: string, value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCopy(id, copyValue ?? code)}
        >
          {copied === id ? (
            <CheckIcon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ClipboardIcon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          )}
          Copy
        </Button>
      </div>
      <CodeArea code={code} />
    </div>
  );
}

/**
 * "Post from your own form" - the public submit endpoint, its field contract,
 * and copy-paste fetch/curl examples, for people wiring a hand-built HTML form
 * to a capture form instead of using the hosted page or embed widget. Public
 * endpoint only: the form's token in the URL is the credential, no key needed.
 */
export function CustomFormApi({
  submitUrl,
  fields,
  allowedOrigins,
}: {
  submitUrl: string;
  fields: CaptureFieldSpec[];
  allowedOrigins: string[];
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [lang, setLang] = useState<"fetch" | "curl">("fetch");
  const copy = (id: string, value: string) => {
    navigator.clipboard.writeText(value).catch(() => undefined);
    setCopied(id);
    toast.success("Copied");
    window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
  };

  // Consent is the top-level `consent` flag, not a `fields` entry, so it never
  // appears in the field contract or the request body.
  const listFields = submittableFields(fields);
  const examples = {
    fetch: buildFetchExample(submitUrl, fields),
    curl: buildCurlExample(submitUrl, fields),
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <CodeBracketIcon className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Post from your own form
          </p>
          <p className="text-xs text-muted-foreground">
            Build the form yourself and POST to this endpoint. The token in the
            URL is the only credential - no API key, no login.
          </p>
        </div>
      </div>

      <CodeBlock
        id="endpoint"
        label="Endpoint"
        code={`POST ${submitUrl}`}
        copyValue={submitUrl}
        copied={copied}
        onCopy={copy}
      />

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          Fields (send inside a `fields` object)
        </Label>
        {listFields.length > 0 ? (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {listFields.map((field) => (
              <li
                key={field.key}
                className="flex items-center justify-between gap-3 bg-muted/30 px-3 py-2 text-xs"
              >
                <code className="font-mono text-foreground">{field.key}</code>
                <span className="text-muted-foreground">
                  {field.type ?? "text"}
                  {field.required ? " · required" : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            This form has no fields yet. Add fields in the Build tab and they
            appear here.
          </p>
        )}
      </div>

      <Tabs
        value={lang}
        onValueChange={(v) => setLang(v as "fetch" | "curl")}
        className="gap-1.5"
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="fetch">JavaScript</TabsTrigger>
            <TabsTrigger value="curl">curl</TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copy(lang, examples[lang])}
          >
            {copied === lang ? (
              <CheckIcon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ClipboardIcon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            )}
            Copy
          </Button>
        </div>
        <TabsContent value="fetch">
          <CodeArea code={examples.fetch} />
        </TabsContent>
        <TabsContent value="curl">
          <CodeArea code={examples.curl} />
        </TabsContent>
      </Tabs>

      <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Consent:</span> send{" "}
          <code className="font-mono">consent: true</code> when the person has
          agreed. Include at least an email or a wallet address so the capture
          can be identified.
        </p>
        <p>
          <span className="font-medium text-foreground">Allowed origins:</span>{" "}
          {allowedOrigins.length > 0 ? (
            <>
              only{" "}
              {allowedOrigins.map((o, i) => (
                <span key={o}>
                  {i > 0 ? ", " : ""}
                  <code className="font-mono">{o}</code>
                </span>
              ))}{" "}
              can post here. Add your site&apos;s origin under Settings →
              Advanced.
            </>
          ) : (
            <>
              any origin can post right now. Restrict this to your own site
              under Settings → Advanced.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
