import type { AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { isJsonObject } from "@/lib/utils";

/**
 * Dashboard help search (RAG) - powers the search bar / command palette
 * "how do I…" experience. Session-auth only (no x-org-id): see backend docs.
 */

export interface HelpSuggestion {
  slug: string;
  title: string;
  category?: string;
  snippet?: string;
}

export interface HelpAskResponse {
  answer: string | null;
  generated: boolean;
  sources: HelpSuggestion[];
}

export interface HelpArticle {
  slug: string;
  title: string;
  category?: string;
  keywords?: string[];
  body: string;
}

const extractData = <T>(payload: unknown): T => {
  if (isJsonObject(payload) && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
};

const request = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const res = await apiClient.request<T>({
    timeout: 30_000,
    ...config,
    headers: { "x-onchain-silent-error": "1", ...(config.headers ?? {}) },
  });
  return extractData<T>(res.data);
};

const toSuggestion = (raw: unknown): HelpSuggestion | null => {
  if (!isJsonObject(raw)) return null;
  const slug = typeof raw.slug === "string" ? raw.slug : "";
  const title = typeof raw.title === "string" ? raw.title : "";
  if (!slug || !title) return null;
  return {
    slug,
    title,
    category: typeof raw.category === "string" ? raw.category : undefined,
    snippet: typeof raw.snippet === "string" ? raw.snippet : undefined,
  };
};

export const helpService = {
  /** Instant typeahead over help articles - no LLM, safe per keystroke. */
  async suggest(q: string, limit = 5, signal?: AbortSignal) {
    const data = await request<unknown>({
      method: "GET",
      url: "/help/suggest",
      params: { q, limit },
      signal,
    });
    const list =
      isJsonObject(data) && Array.isArray(data.suggestions)
        ? data.suggestions
        : Array.isArray(data)
          ? data
          : [];
    return list
      .map(toSuggestion)
      .filter((s): s is HelpSuggestion => s !== null);
  },

  /**
   * Grounded answer over the help corpus. When `generated` is false (no LLM
   * configured or no matching article) render `sources` instead - the
   * endpoint never 5xxs for that.
   */
  async ask(question: string, signal?: AbortSignal) {
    const data = await request<unknown>({
      method: "POST",
      url: "/help/ask",
      data: { question },
      signal,
    });
    const obj = isJsonObject(data) ? data : {};
    const sources = Array.isArray(obj.sources)
      ? obj.sources
          .map(toSuggestion)
          .filter((s): s is HelpSuggestion => s !== null)
      : [];
    return {
      answer: typeof obj.answer === "string" ? obj.answer : null,
      generated: Boolean(obj.generated),
      sources,
    } satisfies HelpAskResponse;
  },

  /** Full markdown article for the help panel. */
  async getArticle(slug: string, signal?: AbortSignal) {
    const data = await request<unknown>({
      method: "GET",
      url: `/help/articles/${encodeURIComponent(slug)}`,
      signal,
    });
    const obj = isJsonObject(data) ? data : {};
    return {
      slug: typeof obj.slug === "string" ? obj.slug : slug,
      title: typeof obj.title === "string" ? obj.title : slug,
      category: typeof obj.category === "string" ? obj.category : undefined,
      keywords: Array.isArray(obj.keywords)
        ? obj.keywords.filter((k): k is string => typeof k === "string")
        : undefined,
      body: typeof obj.body === "string" ? obj.body : "",
    } satisfies HelpArticle;
  },
};
