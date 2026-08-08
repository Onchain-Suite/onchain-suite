"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { extractEmailContent, getSelectedOrganizationId } from "@/lib/utils";

import { campaignsService } from "@/features/campaigns/campaigns.service";
import {
  defaultDocument,
  type EmailDocument,
  parseDocument,
} from "@/features/email-editor/blocks";
import { EmailEditor } from "@/features/email-editor/email-editor";

export const dynamic = "force-dynamic";

/** True when a parsed document has at least one block under the root. */
function docHasContent(doc: EmailDocument): boolean {
  const root = doc.blocks[doc.root];
  return root?.type === "EmailLayout" && root.data.childrenIds.length > 0;
}

/** URL-safe base64 → UTF-8 string (mirrors the wizard's encoder). */
function decodeBase64Url(value: string): string {
  try {
    const norm = value.replace(/-/g, "+").replace(/_/g, "/");
    const pad = norm.length % 4 === 0 ? "" : "=".repeat(4 - (norm.length % 4));
    const bin = atob(norm + pad);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

function EditorScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const campaignId = (searchParams?.get("campaign") ?? "").trim();
  const returnTo = (searchParams?.get("returnTo") ?? "").trim();
  const title = (
    searchParams?.get("templateName") ??
    searchParams?.get("subject") ??
    ""
  ).trim();
  const isPush = (searchParams?.get("channel") ?? "") === "in-app-push";

  const initialDoc = useMemo<EmailDocument>(() => {
    const b64 = (searchParams?.get("initialJsonB64") ?? "").trim();
    if (b64.length > 0) {
      const decoded = decodeBase64Url(b64);
      if (decoded) {
        try {
          const parsed = parseDocument(JSON.parse(decoded));
          if (parsed && docHasContent(parsed)) return parsed;
        } catch {
          // Not our block format (e.g. a legacy EmailLayout doc) - start fresh.
        }
      }
    }
    return defaultDocument();
  }, [searchParams]);

  const contentQuery = useQuery({
    queryKey: ["campaigns", "editor-content", campaignId],
    queryFn: () =>
      campaignsService.getEditorContent(
        campaignId,
        getSelectedOrganizationId() ?? undefined
      ),
    enabled: campaignId.length > 0 && !isPush,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Prefer the campaign's saved content so edits round-trip; fall back to the
  // template/URL doc, then a default. Legacy EmailLayout json won't parse into
  // our block format, so those open fresh.
  const resolvedDoc = useMemo<EmailDocument | null>(() => {
    if (campaignId.length > 0 && !isPush && contentQuery.isLoading) return null;
    if (contentQuery.data) {
      const parsed = parseDocument(extractEmailContent(contentQuery.data).json);
      if (parsed && docHasContent(parsed)) return parsed;
    }
    return initialDoc;
  }, [
    campaignId,
    isPush,
    contentQuery.isLoading,
    contentQuery.data,
    initialDoc,
  ]);

  const [saving, setSaving] = useState(false);

  const goBack = () =>
    router.push(returnTo.startsWith("/") ? returnTo : "/campaigns");

  if (!campaignId) {
    return (
      <FullScreen>
        <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            Missing campaign - open the editor from a campaign.
          </p>
          <Button onClick={() => router.push("/campaigns")}>
            Back to campaigns
          </Button>
        </div>
      </FullScreen>
    );
  }

  if (isPush) {
    return (
      <FullScreen>
        <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
          <p className="max-w-sm text-sm text-muted-foreground">
            In-app push is composed on the campaign&apos;s Message step, not the
            email editor.
          </p>
          <Button onClick={goBack}>Back to campaign</Button>
        </div>
      </FullScreen>
    );
  }

  const handleSave = async ({
    doc,
    html,
    text,
  }: {
    doc: EmailDocument;
    html: string;
    text: string;
  }) => {
    setSaving(true);
    try {
      await campaignsService.editorSaved(
        campaignId,
        { html, json: doc, textVersion: text },
        getSelectedOrganizationId() ?? undefined
      );
      toast.success("Email saved");
      goBack();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save the email.");
    } finally {
      setSaving(false);
    }
  };

  if (resolvedDoc === null) {
    return (
      <FullScreen>
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center gap-3 border-b border-border px-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="ml-auto h-8 w-28 rounded-lg" />
          </div>
          <div className="flex flex-1">
            <div className="w-72 space-y-3 border-r border-border p-4">
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
            <div className="flex-1 bg-muted/30 p-6">
              <Skeleton className="mx-auto h-96 w-full max-w-[640px] rounded-2xl" />
            </div>
          </div>
        </div>
      </FullScreen>
    );
  }

  return (
    <FullScreen>
      <EmailEditor
        initialDoc={resolvedDoc}
        title={title}
        onBack={goBack}
        onSave={handleSave}
        saving={saving}
      />
    </FullScreen>
  );
}

/** Full-viewport overlay so the editor breaks out of the dashboard shell. */
function FullScreen({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 bg-background">{children}</div>;
}

export default function CampaignEditorPage() {
  return (
    <Suspense fallback={null}>
      <EditorScreen />
    </Suspense>
  );
}
