import { isJsonObject } from "@/lib/utils";

export type InAppEnvironment = "production" | "staging" | "development";

export type InAppOrigin = {
  id: string;
  origin: string;
  environment: InAppEnvironment;
};

export type InAppStatus = {
  publishableKeys: { production?: string; test?: string };
  sessionCount: number | null;
  usage: Record<string, unknown> | null;
};

const readString = (obj: Record<string, unknown> | null, key: string) => {
  if (!obj) return "";
  const v = obj[key];
  return typeof v === "string" ? v.trim() : "";
};

const readNumber = (obj: Record<string, unknown> | null, key: string) => {
  if (!obj) return null;
  const v = obj[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};

/**
 * Normalize `GET /integrations/inapp/status` into a stable shape. The backend
 * has returned the publishable keys under several nestings over time
 * (`publishableKeys`, `keys.publishableKeys`, `inapp.keys`, a bare
 * `publishableKey`/`pk`), so this probes each before giving up.
 */
export const normalizeInAppStatus = (input: unknown): InAppStatus => {
  if (!isJsonObject(input)) {
    return {
      publishableKeys: {},
      sessionCount: null,
      usage: null,
    };
  }
  const obj = input as Record<string, unknown>;
  const data = isJsonObject(obj.data)
    ? (obj.data as Record<string, unknown>)
    : obj;

  const keys = isJsonObject(data.keys)
    ? (data.keys as Record<string, unknown>)
    : isJsonObject(data.apiKeys)
      ? (data.apiKeys as Record<string, unknown>)
      : isJsonObject(data.inapp)
        ? (data.inapp as Record<string, unknown>)
        : null;

  const publishableNested = isJsonObject(data.publishable)
    ? (data.publishable as Record<string, unknown>)
    : isJsonObject(data.publishableKey)
      ? (data.publishableKey as Record<string, unknown>)
      : null;
  const inappObj = isJsonObject(data.inapp)
    ? (data.inapp as Record<string, unknown>)
    : null;
  const inappKeysObj = isJsonObject(inappObj?.keys)
    ? (inappObj?.keys as Record<string, unknown>)
    : null;

  const publishableKeysObj =
    (isJsonObject(data.publishableKeys)
      ? (data.publishableKeys as Record<string, unknown>)
      : isJsonObject(keys?.publishableKeys)
        ? (keys?.publishableKeys as Record<string, unknown>)
        : isJsonObject(inappObj?.keys)
          ? (inappObj?.keys as Record<string, unknown>)
          : null) ??
    (isJsonObject(keys?.inapp)
      ? ((keys?.inapp as Record<string, unknown>).keys as Record<
          string,
          unknown
        >)
      : null);

  const production =
    readString(publishableKeysObj, "production") ||
    readString(inappKeysObj, "production") ||
    readString(publishableNested, "production") ||
    readString(publishableNested, "live") ||
    readString(publishableNested, "key") ||
    readString(publishableNested, "value") ||
    readString(data, "publishableKey") ||
    readString(data, "pk");

  const test =
    readString(publishableKeysObj, "test") ||
    readString(inappKeysObj, "test") ||
    readString(publishableNested, "test");

  const sessionCount =
    readNumber(data, "sessionCount") ??
    readNumber(data, "sessions") ??
    readNumber(data, "activeSessions");

  const usage = isJsonObject(data.usage)
    ? (data.usage as Record<string, unknown>)
    : null;

  const publishableKeys: { production?: string; test?: string } = {};
  if (production) publishableKeys.production = production;
  if (test) publishableKeys.test = test;

  return { publishableKeys, sessionCount, usage };
};

/** Normalize `GET /integrations/inapp/origins` (array, `{ data: [] }`, or
 *  `{ data: { data: [] } }`) into a typed list. */
export const normalizeInAppOrigins = (input: unknown): InAppOrigin[] => {
  const list = Array.isArray(input)
    ? input
    : isJsonObject(input) &&
        Array.isArray((input as Record<string, unknown>).data)
      ? ((input as Record<string, unknown>).data as unknown[])
      : isJsonObject(input) &&
          isJsonObject((input as Record<string, unknown>).data) &&
          Array.isArray(
            ((input as Record<string, unknown>).data as Record<string, unknown>)
              .data
          )
        ? (((input as Record<string, unknown>).data as Record<string, unknown>)
            .data as unknown[])
        : [];

  return list
    .map((row): InAppOrigin | null => {
      if (!isJsonObject(row)) return null;
      const o = row as Record<string, unknown>;
      const idRaw = o.id ?? o.originId ?? o._id ?? "";
      const origin = readString(o, "origin");
      const environmentRaw = readString(o, "environment") as InAppEnvironment;
      const id = typeof idRaw === "string" ? idRaw.trim() : String(idRaw);
      if (!id || !origin) return null;
      const environment: InAppEnvironment =
        environmentRaw === "production" ||
        environmentRaw === "staging" ||
        environmentRaw === "development"
          ? environmentRaw
          : "production";
      return { id, origin, environment };
    })
    .filter((v): v is InAppOrigin => Boolean(v));
};

/** True when the workspace has any publishable (web SDK) key installed. */
export const inAppHasPublishableKey = (status: InAppStatus): boolean =>
  Boolean(status.publishableKeys.production) ||
  Boolean(status.publishableKeys.test);
