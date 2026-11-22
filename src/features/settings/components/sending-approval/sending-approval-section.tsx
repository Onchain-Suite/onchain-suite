"use client";

import { useSendingApproval } from "../../hooks/use-sending-approval";
import {
  approvalApplies,
  approvalBanner,
  missingFieldLabel,
} from "../../utils/sending-approval";
import { ApprovalStatusBanner } from "./approval-status-banner";
import { SendingProfileForm } from "./sending-profile-form";
import { useMyOrgRole } from "@/shared/hooks/client/use-my-org-role";

/**
 * Settings → Sending approval. Hidden entirely for a workspace the gate does
 * not apply to (it predates the gate, or approval is not required).
 */
export function SendingApprovalSection() {
  const query = useSendingApproval();
  const { role } = useMyOrgRole();
  const approval = query.data;

  if (query.isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted/60" />;
  }
  if (!approval || !approvalApplies(approval)) return null;

  const banner = approvalBanner(approval);
  const canEdit = role === "OWNER" || role === "ADMIN";

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Sending approval
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          New workspaces are reviewed before they can send marketing email at
          full volume. Receipts, sign-in codes and other transactional email are
          not limited.
        </p>
      </div>

      {banner ? <ApprovalStatusBanner banner={banner} /> : null}

      {approval.missing.length > 0 ? (
        <div className="text-sm">
          <p className="font-medium text-foreground">Still needed</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
            {approval.missing.map((f) => (
              <li key={f}>{missingFieldLabel(f)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {approval.status !== "approved" ? (
        <SendingProfileForm
          // Re-seed the form when a save comes back with new server values.
          key={approval.profile.submittedAt ?? "new"}
          approval={approval}
          canEdit={canEdit}
        />
      ) : null}
    </section>
  );
}
