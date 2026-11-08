import z from "zod";

/**
 * Delivery channel for a campaign. Smart campaigns can send on in-app push,
 * Telegram, Discord, WhatsApp, X and Farcaster - each over the org's connected
 * channel. Email is the default for every non-smart type.
 */
export const campaignChannels = [
  "email",
  "in-app-push",
  "telegram",
  "discord",
  "whatsapp",
  "sms",
  "x",
  "farcaster",
] as const;

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
    // in-app push campaigns. It and the sender fields are required only for the
    // channels that have them (validated in superRefine below).
    selectedTemplate: z.string().optional(),
    emailSubject: z.string(),
    previewText: z.string().optional(),
    // Empty means "inherit from the linked identity" — the default. A value
    // is a deliberate per-campaign override.
    senderName: z.string().optional(),
    senderIdentityId: z.string().optional().nullable(),
    senderEmail: z
      .email("Please enter a valid email address")
      .optional()
      .or(z.literal("")),
    useReplyTo: z.boolean().default(true),
    replyToEmail: z
      .email("Please enter a valid email address")
      .optional()
      .or(z.literal("")),

    // Step 2 (in-app push): notification composer. The full object below -
    // title (= emailSubject) / body / cta + placement / trigger / frequency /
    // accent / dismissible / delivery / expiresDays / maxPerSession - now
    // persists, hydrates and is honored on send via `channelsContent.inapp`
    // (see campaigns.service `CampaignPushContent`).
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

    // Telegram: a single plain-text body, persisted to channelsContent.telegram.text.
    telegramText: z.string().optional(),
    // "dm": each person who started the bot (consent dialog). "channel": one
    // post in the client's Telegram channel, to every subscriber.
    telegramDelivery: z.enum(["dm", "channel"]).default("dm"),
    telegramChannel: z.string().optional(),

    // Discord BROADCAST: a plain-text message + the target channel id, persisted
    // to channelsContent.discord.{text,channelId}. Not per-contact — one post.
    discordText: z.string().optional(),
    discordChannelId: z.string().optional(),
    // "dm" sends discordText as a DM to each member who opted in, behind the
    // consent dialog, instead of one channel post.
    discordDelivery: z.enum(["post", "dm"]).default("post"),
    // Post reach: crosspost to servers following an Announcement channel, and
    // who it pings (mentions are off unless chosen here).
    discordCrosspost: z.boolean().default(false),
    discordMention: z.enum(["none", "role", "everyone"]).default("none"),
    discordMentionRoleId: z.string().optional(),

    // WhatsApp: a pre-approved template name + language (NOT free text), a
    // per-contact fan-out to wallets with a bound WhatsApp number. Persisted to
    // channelsContent.whatsapp.{templateName,languageCode}.
    whatsappTemplateName: z.string().optional(),
    whatsappLanguageCode: z.string().default("en_US"),

    // SMS: a single plain-text body (free text, no template approval), a
    // per-contact fan-out to wallets with an opted-in SMS number. Persisted to
    // channelsContent.sms.body.
    smsBody: z.string().optional(),
    // Track clicks on links in the SMS (channelsContent.sms.trackLinks). Off by
    // default: a tracked link is ~80 characters and SMS bills per segment.
    smsTrackLinks: z.boolean().optional(),

    // X BROADCAST: one tweet via the org's connected X account. Persisted to
    // channelsContent.x.text.
    xText: z.string().optional(),
    // "dm" sends xDmText as a DM to each person bound to the audience, behind
    // the consent dialog (X only allows it to people who DMed you first).
    xDelivery: z.enum(["post", "dm"]).default("post"),
    // Posts 2..n of a thread; post 1 is xText.
    xThreadRest: z.array(z.string()).default([]),
    xDmText: z.string().optional(),

    // Farcaster BROADCAST: one public cast. Persisted to channelsContent.farcaster.text.
    farcasterText: z.string().optional(),
    // "notification": a Mini App notification to people who enabled them,
    // instead of a public cast. Persisted to channelsContent.farcaster.notification.
    farcasterDelivery: z.enum(["cast", "notification"]).default("cast"),
    farcasterNotificationTitle: z.string().optional(),
    farcasterNotificationBody: z.string().optional(),
    farcasterNotificationUrl: z.string().optional(),
    farcasterNotificationAudience: z.enum(["all", "campaign"]).default("all"),

    // Send timing (chosen on the template step: send now or schedule)
    sendOption: z.enum(["now", "schedule"]),
    scheduleDate: z.date().optional(),
    scheduleTime: z.string().optional(),
    timezone: z.string().default("UTC"),
  })
  .superRefine((data, ctx) => {
    // Only email (subject line) and in-app push (title) have a subject. The
    // other channels never render the field, so requiring it unconditionally
    // blocked them on a value the user had no way to enter.
    if (
      (data.channel === "email" || data.channel === "in-app-push") &&
      data.emailSubject.trim().length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["emailSubject"],
        message: "Subject line is required",
      });
    }

    // Email is the only channel with a sender identity; in-app push and Telegram
    // send through the SDK / the org's bot and need no sender fields.
    if (data.channel === "email") {
      // A blank sender name is valid when an identity is linked: the name is
      // inherited from it at render time. Requiring one here is what forced the
      // UI to copy the identity's name into the form, which is how a stale
      // snapshot ended up on every campaign in the first place.
      const hasLinkedIdentity =
        typeof data.senderIdentityId === "string" &&
        data.senderIdentityId.trim().length > 0;
      if (
        !hasLinkedIdentity &&
        (typeof data.senderName !== "string" ||
          data.senderName.trim().length === 0)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["senderName"],
          message: "Pick a sender address, or enter a sender name",
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

    if (data.channel === "telegram") {
      if (
        typeof data.telegramText !== "string" ||
        data.telegramText.trim().length === 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["telegramText"],
          message: "Enter a message to send",
        });
      }
      if (
        data.telegramDelivery === "channel" &&
        !(data.telegramChannel ?? "").trim()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["telegramChannel"],
          message: "Enter the channel to post to, e.g. @your_channel",
        });
      }
    }

    if (data.channel === "discord") {
      if (
        typeof data.discordText !== "string" ||
        data.discordText.trim().length === 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["discordText"],
          message: "Enter a message to send",
        });
      }
      if (
        data.discordDelivery !== "dm" &&
        (typeof data.discordChannelId !== "string" ||
          data.discordChannelId.trim().length === 0)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["discordChannelId"],
          message: "Enter the Discord channel ID to post to",
        });
      }
      if (
        data.discordDelivery !== "dm" &&
        data.discordMention === "role" &&
        !(data.discordMentionRoleId ?? "").trim()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["discordMentionRoleId"],
          message: "Pick the role to mention",
        });
      }
    }

    if (data.channel === "whatsapp") {
      if (
        typeof data.whatsappTemplateName !== "string" ||
        data.whatsappTemplateName.trim().length === 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["whatsappTemplateName"],
          message: "Enter the approved WhatsApp template name",
        });
      }
    }

    if (data.channel === "sms") {
      if (
        typeof data.smsBody !== "string" ||
        data.smsBody.trim().length === 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["smsBody"],
          message: "Enter a message to send",
        });
      }
    }

    if (data.channel === "x") {
      const dm = data.xDelivery === "dm";
      const value = dm ? data.xDmText : data.xText;
      if (!dm && (data.xThreadRest ?? []).length + 1 > 25) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["xThreadRest"],
          message: "A thread can have up to 25 posts",
        });
      }
      if (typeof value !== "string" || value.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [dm ? "xDmText" : "xText"],
          message: dm ? "Enter the DM to send" : "Enter the post to send",
        });
      }
    }

    if (
      data.channel === "farcaster" &&
      data.farcasterDelivery === "notification"
    ) {
      const checks: Array<
        [keyof typeof data, string | undefined, number, string]
      > = [
        [
          "farcasterNotificationTitle",
          data.farcasterNotificationTitle,
          32,
          "a title",
        ],
        [
          "farcasterNotificationBody",
          data.farcasterNotificationBody,
          128,
          "a message",
        ],
      ];
      for (const [path, value, max, what] of checks) {
        const v = (value ?? "").trim();
        if (!v || v.length > max) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [path],
            message: v ? `Keep it to ${max} characters` : `Enter ${what}`,
          });
        }
      }
      if (
        !/^https:\/\/[^\s/]+/.test((data.farcasterNotificationUrl ?? "").trim())
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["farcasterNotificationUrl"],
          message: "Enter an https:// link on your Mini App's domain",
        });
      }
    } else if (data.channel === "farcaster") {
      if (
        typeof data.farcasterText !== "string" ||
        data.farcasterText.trim().length === 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["farcasterText"],
          message: "Enter the cast to send",
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
