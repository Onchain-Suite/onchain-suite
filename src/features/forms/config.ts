/**
 * Forms feature config.
 *
 * Farcaster capture is behind a single flag. Farcaster is wallet-native (an FID
 * maps to a custody address), so it fits the wallet-first model — but if it's
 * winding down for your audience, set `NEXT_PUBLIC_FORMS_FARCASTER=0` (or flip
 * the default below) and the builder stops offering Farcaster fields. Nothing
 * else changes, and forms already created with a Farcaster field still render.
 */
export const FORMS_FARCASTER_ENABLED =
  (process.env.NEXT_PUBLIC_FORMS_FARCASTER ?? "1") !== "0";
