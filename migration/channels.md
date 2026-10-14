# v2.7 migration: Channels

Branch `v2.7-channels` (off `v2.7`). Reference: `reference/v2.7/web/src`. Start with
`reference/v2.7/HANDOFF.md`.

## Target architecture (decided)

Channels is the **`channels` tab inside the one Integrations screen** (built on
`v2.7-integrations`, `DataScreen.tsx`), not a separate screen and not a Settings
tab. This branch owns: the Channels tab UI, the channel-readiness model, the X
channel, and the channel side of campaigns/analytics. Coordinate the tab slot with
`v2.7-integrations` (`docs`-equivalent: `migration/integrations.md`).

Today channel setup is split: email under Settings -> Account, in-app/mobile push
under Settings -> Integrations, social nowhere. There is no cross-channel overview.

## The reference channel set (read this first)

The reference built only **email, push (web + mobile as one channel), and X**.
Telegram was deliberately removed, Discord is a type-level stub (icon/label only,
no panel), and Farcaster/WhatsApp never existed there. So **only X ports from the
reference.** Discord / Telegram / Farcaster / WhatsApp are net-new and must be
driven by the backend `campaign-types` / `ensureChannels` contract
(`inapp/telegram/discord/x`) and the channels scoping doc, not by v2.7 code.

## Preserve (the app already does these better)

- Email sender verification: `src/features/settings/components/account/sender-verification-card.tsx`
  (+ `sender-identities.service.ts`) - reuse as the email detail panel.
- In-app web SDK + mobile push: `src/features/settings/components/integrations/inapp.tsx`,
  `push-credentials.tsx` - reuse as the push detail (web + mobile under one "push").
- Full ESP + in-app funnels: `campaigns.service.ts` `CampaignEmailFunnel` /
  `CampaignInAppFunnel`; PAYG allowance. Keep the channel-native metrics; add the
  normalized funnel alongside, do not replace.

## Steps

- [x] **1. Channel-readiness model (foundation).** Done: new `src/features/channels/`
  with `types/channel.ts` (`ChannelId`/`ChannelReadiness`), a pure, unit-tested
  `utils/readiness.ts` (`deriveChannelReadiness` + web/mobile push status), and
  `hooks/use-channel-readiness.ts` that derives email/push readiness from the
  real `sender-identities` / `inAppService` / `pushCredentialsService` reads.
  Email = any verified domain; push = web (key + live session) OR mobile
  (verified APNs/FCM credential); X is stubbed until step 3. Note: mobile has no
  device-token signal in the app yet, so a verified credential reads as
  connected (reference also gates on a registered device).
  FROM `reference/v2.7/web/src/data/store.ts` (`ChannelReadiness`,
  `useChannelReadiness`, `SenderDomain`/`PushInstall`/`MobilePushInstall`/`XInstall`,
  the `mobileConnected = (apns||fcm) && tokenSeen` gate).
  INTO a new `src/features/channels/channels.service.ts` that derives readiness from
  the existing `sender-identities.service.ts`, `inapp.service.ts`,
  `push-credentials.service.ts`. Reuse the app's status types; add an `x` entry
  (stub until step 3).

- [x] **2. Channels tab UI.** Done: `channels-tab.tsx` wired into the Integrations
  screen's `channels` tab. A readiness list ("{live} of {n} can send", one row per
  channel with its blocker and a Connected/Waiting/Not-set-up badge); opening a
  row shows that channel's setup, reusing the real settings cards -
  `SenderVerificationCard` (email), `InAppIntegration` + `PushCredentialsCard`
  (push web + mobile). X is a placeholder until step 3. The "send setup to
  someone" handoff is step 4.
  FROM `reference/v2.7/web/src/components/ChannelsTab.tsx` + `ChannelDetail` +
  `channels.css` - the "{live} of {n} can send" header, a readiness row per channel
  (icon, label, blocker, status badge, Set up / Manage), detail on open.
  INTO `src/features/channels/components/channels-tab.tsx`, slotted into the
  Integrations screen. The detail view reuses `sender-verification-card.tsx`
  (email) and `inapp.tsx` + `push-credentials.tsx` (push web + mobile).

- [x] **3a. X connect surface + readiness (done).** `x.service.ts` (typed
  `XConnection`, `getStatus` that reads `/channels/x/status` and degrades to "not
  connected" when the backend is absent) + `components/x-connect.tsx` (the panel:
  two-part connection + reachable-followers, pending = authorised-but-no-reachable
  audience; OAuth "Authorise" stubbed until the backend ships). Wired into
  `useChannelReadiness` and swapped into the Channels tab's X detail. Ported from
  `reference/.../SocialConnect.tsx`.
- [ ] **3b. Enable X as a sendable channel (gated on backend).** Flip
  `campaignChannels` in `campaigns/validations/campaign.ts:7`, un-stub
  `create-campaign-sheet.tsx:228-239`, add a `send_x` node to
  `automation/utils/builder-catalog.ts` (+ `builder-graph.ts`, `node-icons.tsx`,
  `builder-issues.ts`). **Deliberately deferred:** the backend cannot send on X
  yet, so exposing X as a selectable campaign/automation channel now would let
  users build campaigns that silently fail. Do this once the X send backend
  (OAuth + send path) exists.

- [ ] **4. Setup handoff ("send setup to someone").**
  FROM `reference/v2.7/web/src/components/Handoff.tsx` + `data/handoff.ts` +
  `useHandoffStatus`.
  INTO `src/features/channels/components/`. Needs a backend endpoint to send the
  instructions; gate the UI behind it.

- [ ] **5. Cross-channel frequency budget.**
  FROM `reference/v2.7/web/src/data/store.ts` `FrequencyBudget`
  (`maxPerWeek`, `minHoursBetween`, `exemptTransactional`) + its Settings editor.
  INTO `src/features/settings` next to `smart-sending.service.ts` (today
  per-campaign only). Backend contract needed - this is "how often a person hears
  from you" across all channels.

- [x] **6. Push composer parity (verified - no port needed).** Checked the app's
  composer (`campaigns/validations/campaign.ts:69-92`,
  `campaign-form/in-app-message-step.tsx`, 681 lines) against the reference
  `PushComposer.tsx`:
  - **Fields:** every reference `PushContent` field maps to an app field
    (surface->pushPlacement, ttlDays->pushExpiresDays, maxPerSession->
    pushMaxPerSession, title/body/ctaLabel/ctaUrl/accent/dismissible/delivery/
    frequency), and the app adds `pushDismissible`. The name differences are the
    app's canonical backend contract (`channelsContent.inapp`), so they stay -
    renaming to match the reference would break the backend.
  - **Preview:** the app's `InAppPreview` (a live, placement-aware preview with a
    mock browser frame rendering the composed title/body/cta) already covers, and
    exceeds, the reference's `PushPreview` / `PushCard`. Nothing to port.
  - **Only gap:** the reference's `route` / `delay` trigger variants (the app has
    wallet-connect / page-view / manual). Adding them needs backend support for
    those trigger semantics, so it is left for when that lands.

## Deferred / cross-cutting (coordinate with `v2.7-analytics`)

The reference's **"2.5 campaign model"** is a larger workstream that spans Channels,
Campaigns, and Analytics, and needs backend attribution. It is NOT a blocker for the
Channels tab. When we take it on:

- FROM `reference/v2.7/web/src/data/campaignModel.ts` (`ConversionGoal`/`GOALS`
  on-chain goal + attribution window; `RouteStep`/`ROUTABLE` route with fallback,
  not a single channel; `ChannelConstraint`/`CONSTRAINTS` stated at selection;
  `SendTimeModel`; normalized `Funnel`/`funnelFor`; `ChannelSlice`/`slicesFor` +
  `ENGAGED_LABEL`) and `screens/CampaignWizard.tsx`, `screens/AnalyticsScreen.tsx`.
- INTO `src/features/campaigns/` (model under `utils/`), the `campaign-form/`
  wizard, and `components/analytics-overview.tsx` + `CampaignAnalyticsOverview`
  (extend beyond `email` + `inapp`, add the reached/engaged/converted/lost funnel
  and per-channel credit).
