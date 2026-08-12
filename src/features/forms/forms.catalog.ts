import type { CaptureFieldSpec, CaptureFieldType } from "./forms.service";

/**
 * Catalog for the form create/build flow (style -> template -> content).
 *
 * The reference product splits forms into two *surfaces* - an embeddable widget
 * (four positioned styles) and a standalone hosted page - and seeds fields from
 * a starting template. None of style/template/type is a first-class backend
 * field (`POST /forms` only takes `{ name, fields, settings, ... }`), so these
 * live in the opaque `settings` blob via `readFormMeta`/`writeFormMeta`.
 */

/** How the form appears. Only `hosted` maps to the `hosted` surface. */
export type FormStyleId =
  "inline" | "popup" | "hellobar" | "slidein" | "hosted";

/** Widget = embedded on the customer's site; hosted = a page we serve. */
export type FormSurface = "widget" | "hosted";

/** Starting template; drives the default field set + capture type. */
export type FormTemplateId =
  "basic" | "waitlist" | "connect" | "airdrop" | "newsletter";

/** Identity capture = wallet-first + verified link; lead = email, wallet optional. */
export type FormCaptureType = "identity" | "lead";

export interface FormStyleDef {
  id: FormStyleId;
  name: string;
  desc: string;
  surface: FormSurface;
}

export interface FormTemplateDef {
  id: FormTemplateId;
  name: string;
  desc: string;
  type: FormCaptureType;
  /** Field types (in order) this template seeds. */
  fields: CaptureFieldType[];
}

export const FORM_STYLES: readonly FormStyleDef[] = [
  {
    id: "inline",
    name: "Inline",
    desc: "Sits within your page",
    surface: "widget",
  },
  {
    id: "popup",
    name: "Pop-up",
    desc: "Centered modal overlay",
    surface: "widget",
  },
  {
    id: "hellobar",
    name: "Hello bar",
    desc: "Sticky top banner",
    surface: "widget",
  },
  {
    id: "slidein",
    name: "Slide-in",
    desc: "Corner slide-in card",
    surface: "widget",
  },
  {
    id: "hosted",
    name: "Hosted page",
    desc: "Standalone link we host",
    surface: "hosted",
  },
] as const;

export const FORM_TEMPLATES: readonly FormTemplateDef[] = [
  {
    id: "basic",
    name: "Basic",
    desc: "Email + subscribe",
    type: "lead",
    fields: ["email", "consent"],
  },
  {
    id: "waitlist",
    name: "Waitlist",
    desc: "Connect wallet + email",
    type: "identity",
    fields: ["wallet", "email", "consent"],
  },
  {
    id: "connect",
    name: "Wallet connect",
    desc: "Wallet-only gate",
    type: "identity",
    fields: ["wallet", "consent"],
  },
  {
    id: "airdrop",
    name: "Airdrop eligibility",
    desc: "Connect + verify + email",
    type: "identity",
    fields: ["wallet", "email", "x", "consent"],
  },
  {
    id: "newsletter",
    name: "Newsletter",
    desc: "Lead capture, styled",
    type: "lead",
    fields: ["email", "consent"],
  },
] as const;

/** Presentation/behaviour for each field kind in the builder + preview. */
export interface FieldCatalogEntry {
  /** Palette label (e.g. "Connect wallet"). */
  name: string;
  /** Fixed fields (wallet, consent) can't be reordered out / duplicated / made optional. */
  fixed?: boolean;
  /** Whether the "Required" toggle applies. */
  canRequire: boolean;
}

export const FIELD_CATALOG: Record<CaptureFieldType, FieldCatalogEntry> = {
  wallet: { name: "Connect wallet", fixed: true, canRequire: false },
  email: { name: "Email", canRequire: true },
  x: { name: "Link X", canRequire: true },
  farcaster: { name: "Link Farcaster", canRequire: true },
  text: { name: "Short text", canRequire: true },
  consent: { name: "Consent", fixed: true, canRequire: true },
};

/** "Maps to" options for the content editor's property dropdown. */
export const FIELD_PROPERTY_OPTIONS = [
  "Do not store",
  "Email",
  "Display name",
  "Twitter / X handle",
  "Farcaster handle",
  "Referral code",
  "Custom property…",
] as const;

/** Default property mapping per field type. */
export const DEFAULT_FIELD_PROPERTY: Partial<Record<CaptureFieldType, string>> =
  {
    email: "Email",
    text: "Display name",
    x: "Twitter / X handle",
    farcaster: "Farcaster handle",
  };

const CONSENT_LABEL =
  "I agree to receive updates and consent to linking my wallet to my contact details. I can unsubscribe any time.";

export const getStyle = (id: FormStyleId): FormStyleDef =>
  FORM_STYLES.find((s) => s.id === id) ?? FORM_STYLES[0];

export const getTemplate = (
  id: FormTemplateId | null
): FormTemplateDef | null =>
  id ? (FORM_TEMPLATES.find((t) => t.id === id) ?? null) : null;

export const surfaceForStyle = (id: FormStyleId): FormSurface =>
  getStyle(id).surface;

/** Timing rules apply only to overlay widget styles (pop-up / slide-in / hello bar). */
export const timingApplies = (
  style: FormStyleId,
  surface: FormSurface
): boolean => surface === "widget" && style !== "inline";

const labelForField = (type: CaptureFieldType): string => {
  switch (type) {
    case "wallet":
      return "Wallet";
    case "email":
      return "Email address";
    case "x":
      return "X (Twitter)";
    case "farcaster":
      return "Farcaster";
    case "consent":
      return CONSENT_LABEL;
    default:
      return "Your answer";
  }
};

/** Seed the field list for a chosen template (matches the reference `ge` handler). */
export const defaultFieldsForTemplate = (
  template: FormTemplateDef
): CaptureFieldSpec[] => {
  const taken = new Set<string>();
  return template.fields.map((type) => {
    let key: string = type;
    let n = 1;
    while (taken.has(key)) key = `${type}_${n++}`;
    taken.add(key);
    return {
      key,
      type,
      label: labelForField(type),
      // social links are opt-in, everything else defaults to required
      required: type !== "x" && type !== "farcaster",
    } satisfies CaptureFieldSpec;
  });
};

/** The submit button copy differs by capture type. */
export const submitLabelForType = (type: FormCaptureType): string =>
  type === "identity" ? "Verify & join" : "Subscribe";
