/**
 * `GET /campaigns/:id/send-preflight` (backend `campaign.service.ts`
 * getSendPreflight; sunset block from `modules/sunset/API.md`, 2026-11-22).
 * Only the fields the review step reads are typed; the rest of the body
 * (effectiveLimits, sendingStatus, presend) is left to other callers.
 */

export interface SendPreflightSunset {
  /** Whether this campaign applies the unengaged-contact exclusion. */
  applied: boolean;
  /** Recipients it leaves out. Already subtracted from `afterSuppression`. */
  excluded: number;
  /** Ready-to-show line from the backend, null when nobody is excluded. */
  note: string | null;
}

export interface SendPreflight {
  /** Everyone the audience resolves to, before any exclusion. */
  recipients: number;
  /** What will actually be mailed: after suppression, the shared bounce list and sunset. */
  afterSuppression: number;
  /** Absent on a backend older than 2026-11-22. */
  sunset?: SendPreflightSunset;
  estimatedDurationHours?: number;
  spansDays?: boolean;
  warnings?: string[];
  blocked?: boolean;
}
