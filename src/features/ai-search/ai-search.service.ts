import type { AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

/**
 * Semantic search over the organization's ingested content
 * (`GET /query/search`) - no LLM call, no AI-credit spend. Powers the
 * command palette's live "From your workspace" results; the streaming
 * RAG answer (`GET /query/text/stream`) stays in the palette itself.
 */

export interface SemanticSearchResult {
  sourceUri: string;
  title: string;
  snippet: string;
  score: number;
}

const pickOrgId = (orgId?: string) =>
  orgId ?? getSelectedOrganizationId() ?? null;

const extractData = <T>(payload: unknown): T => {
  if (isJsonObject(payload) && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
};

const request = async <T>(
  config: AxiosRequestConfig,
  orgId?: string
): Promise<T> => {
  const resolvedOrgId = pickOrgId(orgId);
  if (!resolvedOrgId) {
    throw new Error("No active organization selected");
  }
  const res = await apiClient.request<T>({
    ...config,
    headers: {
      ...(config.headers ?? {}),
      "x-org-id": resolvedOrgId,
      "x-onchain-silent-error": "1",
    },
  });
  return extractData<T>(res.data);
};

const normalizeResults = (payload: unknown): SemanticSearchResult[] => {
  const root = isJsonObject(payload) ? payload : {};
  const list = Array.isArray(root.results) ? root.results : [];
  return list
    .map((entry): SemanticSearchResult | null => {
      if (!isJsonObject(entry)) return null;
      const sourceUri =
        typeof entry.sourceUri === "string" ? entry.sourceUri : "";
      if (!sourceUri) return null;
      return {
        sourceUri,
        title:
          typeof entry.title === "string" && entry.title.trim().length > 0
            ? entry.title
            : sourceUri,
        snippet: typeof entry.snippet === "string" ? entry.snippet : "",
        score: typeof entry.score === "number" ? entry.score : 0,
      };
    })
    .filter((r): r is SemanticSearchResult => r !== null);
};

export const aiSearchService = {
  search(query: string, topK = 5, orgId?: string) {
    return request<unknown>(
      { method: "GET", url: "/query/search", params: { query, topK } },
      orgId
    ).then(normalizeResults);
  },

  /** Relevance feedback for a RAG answer (`POST /ai/feedback`, rating 1–5). */
  sendFeedback(
    body: { rating: number; queryLogId?: string; comment?: string },
    orgId?: string
  ) {
    return request<unknown>(
      { method: "POST", url: "/ai/feedback", data: body },
      orgId
    );
  },
};
