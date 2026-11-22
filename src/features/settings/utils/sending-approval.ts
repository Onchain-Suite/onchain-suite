import type {
  SendingApproval,
  SendingProjectType,
  UpdateSendingProfileBody,
} from "../contracts/sending-approval";

export const SENDING_APPROVAL_HREF = "/settings?tab=sending";

/** Whether the workspace has anything to do with the gate at all. */
export const approvalApplies = (a: SendingApproval | null | undefined) =>
  Boolean(a && a.requiresApproval && !a.grandfathered);

export const PROJECT_TYPE_OPTIONS: {
  value: SendingProjectType;
  label: string;
}[] = [
  { value: "protocol", label: "Protocol or dApp" },
  { value: "exchange", label: "Exchange" },
  { value: "wallet", label: "Wallet" },
  { value: "nft", label: "NFT project" },
  { value: "token_launch", label: "Token launch, airdrop or presale" },
  { value: "other", label: "Something else" },
];

const FIELD_LABELS: Record<string, string> = {
  website: "Your website",
  projectType: "What kind of project this is",
  optInSource: "How people opted in to your emails",
  sampleEmail: "A sample email",
  expectedMonthlyVolume: "How many emails you expect to send a month",
};

export const missingFieldLabel = (f: string) =>
  FIELD_LABELS[f] ??
  f.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

export interface ApprovalBanner {
  tone: "pending" | "rejected" | "approved";
  title: string;
  body: string;
}

/** The status banner for the settings section, or null when nothing applies. */
export function approvalBanner(
  a: SendingApproval | null | undefined
): ApprovalBanner | null {
  if (!a || !approvalApplies(a)) return null;
  if (a.status === "rejected") {
    return {
      tone: "rejected",
      title: "Marketing email is turned off for this workspace",
      body: a.review.reason
        ? `We reviewed your account and did not approve it: ${a.review.reason} Update your sending profile below and submit it again.`
        : "We reviewed your account and did not approve it. Update your sending profile below and submit it again, or contact support.",
    };
  }
  if (a.status === "pending_review") {
    const cap =
      a.limits.dailyMarketingCap ?? a.limits.pendingDailyMarketingCap ?? 500;
    const sent = a.limits.sentToday;
    return {
      tone: "pending",
      title: `You can send up to ${cap.toLocaleString()} marketing emails a day until we approve your account`,
      body:
        (sent !== null
          ? `${sent.toLocaleString()} of ${cap.toLocaleString()} sent today. `
          : "") +
        (a.missing.length > 0
          ? "Complete your sending profile below so we can review it."
          : "Your profile is in. We'll review it and lift the limit."),
    };
  }
  return {
    tone: "approved",
    title: "Your account is approved for marketing email",
    body:
      a.tier === "high_risk"
        ? "Sends over 10,000 recipients ask you to run a seed test first."
        : "No daily limit from this review.",
  };
}

export interface SendingProfileDraft {
  website: string;
  projectType: SendingProjectType | "";
  optInSource: string;
  sampleMode: "design" | "html";
  sampleDesignId: string;
  sampleHtml: string;
  expectedMonthlyVolume: string;
}

export function draftFromApproval(a: SendingApproval): SendingProfileDraft {
  return {
    website: a.profile.website ?? "",
    projectType: a.profile.projectType ?? "",
    optInSource: a.profile.optInSource ?? "",
    sampleMode:
      a.profile.hasSampleHtml && !a.profile.sampleDesignId ? "html" : "design",
    sampleDesignId: a.profile.sampleDesignId ?? "",
    sampleHtml: "",
    expectedMonthlyVolume:
      a.profile.expectedMonthlyVolume !== null
        ? String(a.profile.expectedMonthlyVolume)
        : "",
  };
}

/** Field-level problems the backend would 400 on, keyed by field. */
export function profileDraftErrors(
  d: SendingProfileDraft
): Partial<Record<keyof SendingProfileDraft, string>> {
  const errors: Partial<Record<keyof SendingProfileDraft, string>> = {};
  const site = d.website.trim();
  if (site) {
    try {
      const u = new URL(site);
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
    } catch {
      errors.website = "Enter a full URL, like https://example.xyz";
    }
  }
  const optIn = d.optInSource.trim();
  if (optIn && (optIn.length < 10 || optIn.length > 2000))
    errors.optInSource = "Use 10 to 2,000 characters.";
  const vol = d.expectedMonthlyVolume.trim();
  if (vol && !(Number.isInteger(Number(vol)) && Number(vol) >= 0))
    errors.expectedMonthlyVolume = "Enter a whole number.";
  return errors;
}

/** The PUT body: only fields with a value, so a blank never overwrites a saved one. */
export function profileDraftToBody(
  d: SendingProfileDraft
): UpdateSendingProfileBody {
  const body: UpdateSendingProfileBody = {};
  if (d.website.trim()) body.website = d.website.trim();
  if (d.projectType) body.projectType = d.projectType;
  if (d.optInSource.trim()) body.optInSource = d.optInSource.trim();
  if (d.sampleMode === "design" && d.sampleDesignId.trim())
    body.sampleDesignId = d.sampleDesignId.trim();
  if (d.sampleMode === "html" && d.sampleHtml.trim())
    body.sampleHtml = d.sampleHtml.trim();
  if (d.expectedMonthlyVolume.trim())
    body.expectedMonthlyVolume = Number(d.expectedMonthlyVolume.trim());
  return body;
}
