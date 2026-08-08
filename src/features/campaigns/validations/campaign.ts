import z from "zod";

/**
 * Delivery channel for a campaign. Smart campaigns currently support in-app
 * push only; social channels (Telegram, Discord, X) will be added later.
 */
export const campaignChannels = ["email", "in-app-push"] as const;

export const campaignFormSchema = z
  .object({
    // Campaign details (collected in the create-campaign sheet)
    campaignName: z.string().min(1, "Campaign name is required"),
    campaignType: z.enum([
      "email-blast",
      "smart-sending",
      "newsletter",
      "promotional",
      "announcement",
      "automation",
    ]),
    channel: z.enum(campaignChannels).default("email"),

    // Step 1: Audience & Tracking
    selectedAudiences: z
      .array(z.string())
      .min(1, "Select at least one audience"),
    smartSending: z.boolean().default(true),
    /**
     * Optional per-campaign override of the Smart Sending suppression window
     * (backend accepts an integer 1–168). Empty string = inherit the org
     * setting, which is the common case. Kept as a plain optional string -
     * a `.refine()` here measurably slows type inference across this schema,
     * and the value is range-checked before it reaches the API anyway.
     */
    smartSendingWindowHours: z.string().optional(),
    trackingParameters: z.boolean().default(true),
    // UTM parameters appended to links when tracking is on.
    utmSource: z.string().optional(),
    utmMedium: z.string().optional(),
    utmCampaign: z.string().optional(),
    utmTerm: z.string().optional(),
    utmContent: z.string().optional(),

    // Step 2: Template & Message. The subject doubles as the push title for
    // in-app push campaigns; sender fields only apply to email (validated in
    // superRefine below).
    selectedTemplate: z.string().optional(),
    emailSubject: z.string().min(1, "Subject line is required"),
    previewText: z.string().optional(),
    senderName: z.string().optional(),
    senderEmail: z
      .email("Please enter a valid email address")
      .optional()
      .or(z.literal("")),
    useReplyTo: z.boolean().default(true),
    replyToEmail: z
      .email("Please enter a valid email address")
      .optional()
      .or(z.literal("")),

    // Step 2 (in-app push): notification composer. The backend persists only
    // title (= emailSubject) / body / cta under `channelsContent.inapp`; the
    // placement, trigger, and display/delivery settings below are frontend-only
    // until the in-app settings API ships.
    pushPlacement: z
      .enum(["modal", "banner", "slide-in", "inline", "mobile-push"])
      .default("modal"),
    pushBody: z.string().optional(),
    pushCtaLabel: z.string().optional(),
    pushCtaUrl: z.string().optional(),
    pushTrigger: z
      .enum(["wallet-connect", "page-view", "manual"])
      .default("wallet-connect"),
    pushFrequency: z
      .enum([
        "once-per-wallet",
        "once-per-session",
        "every-time",
        "until-dismissed",
      ])
      .default("once-per-wallet"),
    pushAccent: z.string().default("#4f46e5"),
    pushDismissible: z.boolean().default(true),
    pushDelivery: z
      .enum(["wait-for-connect", "only-now"])
      .default("wait-for-connect"),
    pushExpiresDays: z.string().default("14"),
    pushMaxPerSession: z.string().default("1"),

    // Send timing (chosen on the template step: send now or schedule)
    sendOption: z.enum(["now", "schedule"]),
    scheduleDate: z.date().optional(),
    scheduleTime: z.string().optional(),
    timezone: z.string().default("UTC"),
  })
  .superRefine((data, ctx) => {
    if (data.channel !== "in-app-push") {
      if (
        typeof data.senderName !== "string" ||
        data.senderName.trim().length === 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["senderName"],
          message: "Sender name is required",
        });
      }
      if (
        typeof data.senderEmail !== "string" ||
        data.senderEmail.trim().length === 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["senderEmail"],
          message: "Please enter a valid email address",
        });
      }
    }

    if (data.sendOption !== "schedule") return;
    if (!(data.scheduleDate instanceof Date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduleDate"],
        message: "Select a schedule date",
      });
    }
    if (
      typeof data.scheduleTime !== "string" ||
      data.scheduleTime.trim().length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduleTime"],
        message: "Select a schedule time",
      });
    }
  });

export type CampaignFormData = z.input<typeof campaignFormSchema>;
export type CampaignChannel = (typeof campaignChannels)[number];
