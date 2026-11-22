/**
 * Per-automation sunset switch (backend `modules/sunset/API.md`, 2026-11-22).
 *
 * `GET /automations/:id/settings/sunset` and `PUT` (OWNER/ADMIN/EDITOR) with
 * `{ sunset: boolean }`. The same value is `settings.sunset` in the builder
 * graph; the runtime reads savedGraph → draftGraph → root, and this route
 * writes every layer, so it is what the send path does.
 */
export interface AutomationSunsetSetting {
  automationId: string;
  /** true = email steps skip unengaged contacts (the default). */
  sunset: boolean;
  /** Always true: what an automation does when nobody chose. */
  default: boolean;
}

export interface UpdateAutomationSunsetBody {
  sunset: boolean;
}
