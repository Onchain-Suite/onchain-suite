import { extractEmailContent } from "@/lib/utils";

import { reportEmailDebug } from "./debug";

export const toSavedPayload = (raw: unknown) => {
  const extracted = extractEmailContent(raw);
  return {
    html: extracted.html,
    textVersion: extracted.textVersion,
    json: extracted.json,
    assets: extracted.assets,
  };
};

/**
 * `POST /campaigns/:id/editor/saved`: normalize the saved payload to
 * `{ html, textVersion, json, assets }` before it reaches the backend.
 */
export function rewriteEditorSavedBody(
  method: string,
  path: string[],
  input: ArrayBuffer | undefined,
  headers: Headers
): ArrayBuffer | undefined {
  let body = input;
  const isCampaignEditorSaved =
    method === "POST" &&
    path.length === 4 &&
    path[0] === "campaigns" &&
    path[2] === "editor" &&
    path[3] === "saved";
  if (isCampaignEditorSaved && body) {
    try {
      const rawText = new TextDecoder().decode(body);
      const parsed = rawText.trim().length > 0 ? JSON.parse(rawText) : null;
      // #region debug-point A:editor-saved-raw
      reportEmailDebug(
        "A",
        "src/app/api/v1/[...path]/route.ts:1875",
        "[DEBUG] editor saved raw payload received",
        {
          path: path.join("/"),
          rawLength: rawText.length,
          topLevelKeys:
            parsed && typeof parsed === "object" ? Object.keys(parsed) : [],
          payloadKeys:
            parsed &&
            typeof parsed === "object" &&
            parsed !== null &&
            "payload" in parsed &&
            typeof (parsed as { payload?: unknown }).payload === "object" &&
            (parsed as { payload?: object }).payload !== null
              ? Object.keys(
                  (parsed as { payload: Record<string, unknown> }).payload
                )
              : [],
        }
      );
      // #endregion
      const payload = toSavedPayload(parsed);
      // #region debug-point A:editor-saved-normalized
      reportEmailDebug(
        "A",
        "src/app/api/v1/[...path]/route.ts:1899",
        "[DEBUG] editor saved payload normalized",
        {
          hasHtml: typeof payload.html === "string" && payload.html.length > 0,
          htmlLength:
            typeof payload.html === "string" ? payload.html.length : 0,
          hasText:
            typeof payload.textVersion === "string" &&
            payload.textVersion.length > 0,
          textLength:
            typeof payload.textVersion === "string"
              ? payload.textVersion.length
              : 0,
          hasJson: payload.json !== undefined && payload.json !== null,
          hasAssets: payload.assets !== undefined && payload.assets !== null,
        }
      );
      // #endregion
      const nextBody = JSON.stringify(payload);
      body = new TextEncoder().encode(nextBody).buffer;
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
    } catch (_e) {
      String(_e);
    }
  }
  return body;
}

/** Debug the email content a campaign preview/test/content response carries. */
export async function debugCampaignEmailResponse(
  method: string,
  path: string[],
  upstream: Response
): Promise<void> {
  const isCampaignPreview =
    method === "POST" &&
    path.length === 3 &&
    path[0] === "campaigns" &&
    path[2] === "preview";
  const isCampaignSendTest =
    method === "POST" &&
    path.length === 3 &&
    path[0] === "campaigns" &&
    path[2] === "send-test";
  const isCampaignEditorContent =
    method === "GET" &&
    path.length === 4 &&
    path[0] === "campaigns" &&
    path[2] === "editor" &&
    path[3] === "content";
  if (isCampaignPreview || isCampaignSendTest || isCampaignEditorContent) {
    const cloned = upstream.clone();
    const text = await cloned.text().catch(() => "");
    const json: unknown = (() => {
      try {
        return text.length > 0 ? JSON.parse(text) : null;
      } catch {
        return null;
      }
    })();
    const obj =
      json && typeof json === "object" ? (json as Record<string, unknown>) : {};
    const extracted = extractEmailContent(json);
    // #region debug-point C:campaign-email-proxy-response
    reportEmailDebug(
      isCampaignPreview ? "B" : isCampaignSendTest ? "D" : "C",
      "src/app/api/v1/[...path]/route.ts:2172",
      "[DEBUG] campaign email proxy response",
      {
        path: path.join("/"),
        status: upstream.status,
        textLength: text.length,
        hasHtml:
          typeof extracted.html === "string" && extracted.html.length > 0,
        htmlLength:
          typeof extracted.html === "string" ? extracted.html.length : 0,
        hasText:
          typeof extracted.textVersion === "string" &&
          extracted.textVersion.length > 0,
        textLengthValue:
          typeof extracted.textVersion === "string"
            ? extracted.textVersion.length
            : 0,
        hasJson: extracted.json !== undefined && extracted.json !== null,
        success: typeof obj.success === "boolean" ? obj.success : upstream.ok,
      }
    );
    // #endregion
  }
}
