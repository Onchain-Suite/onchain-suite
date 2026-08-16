"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";

import { EmbeddedEmailEditor } from "@/features/campaigns/components/embedded-email-editor";

export const dynamic = "force-dynamic";

/**
 * Campaign email editor route. For now this embeds the hosted OnchainSuite
 * builder (editor.onchainsuite.com) via {@link EmbeddedEmailEditor} while the
 * from-scratch block editor (`@/features/email-editor`) is being stabilised.
 * The block editor is left in the codebase; swapping back is a one-file change.
 */
function EditorScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const campaignId = (searchParams?.get("campaign") ?? "").trim();
  const returnTo = (searchParams?.get("returnTo") ?? "").trim();
  // Present when editing an existing saved template - saves update it in place
  // instead of creating a new one.
  const templateId = (searchParams?.get("template") ?? "").trim();
  const title = (
    searchParams?.get("templateName") ??
    searchParams?.get("subject") ??
    ""
  ).trim();
  const isPush = (searchParams?.get("channel") ?? "") === "in-app-push";

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

  return (
    <FullScreen>
      <EmbeddedEmailEditor
        campaignId={campaignId}
        templateId={templateId}
        title={title}
        onBack={goBack}
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
