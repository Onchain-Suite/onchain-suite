import type { AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import type {
  SetWorkspaceAnswersBody,
  StoredAnswer,
  WorkspaceAnswers,
} from "./contracts/answers";
import { isStartPath, type StartPath } from "./utils/start-path";

export type {
  AnswerSource,
  SetWorkspaceAnswersBody,
  WorkspaceAnswers,
} from "./contracts/answers";

/** Short: Home waits on this before deciding what to show. */
const TIMEOUT_MS = 8000;

const request = async (config: AxiosRequestConfig, orgId?: string) => {
  const resolved = orgId ?? getSelectedOrganizationId() ?? null;
  const res = await apiClient.request<unknown>({
    ...config,
    timeout: TIMEOUT_MS,
    headers: {
      ...(config.headers ?? {}),
      ...(resolved ? { "x-org-id": resolved } : {}),
      // Advisory data: a failure falls back to the browser's copy, silently.
      "x-onchain-silent-error": "1",
    },
  });
  const payload = res.data;
  return isJsonObject(payload) && "data" in payload ? payload.data : payload;
};

const toAnswer = (raw: unknown): StoredAnswer | null => {
  if (!isJsonObject(raw)) return null;
  const { value, setAt, source } = raw;
  if (typeof value !== "string" || value.length === 0) return null;
  return {
    value,
    setAt: typeof setAt === "string" ? setAt : "",
    source: source === "home" || source === "settings" ? source : "onboarding",
  };
};

/** The wire payload as typed answers; anything malformed reads as not given. */
export const toWorkspaceAnswers = (payload: unknown): WorkspaceAnswers => {
  const obj = isJsonObject(payload) ? payload : {};
  const start = toAnswer(obj.startPath);
  return {
    startPath:
      start && isStartPath(start.value)
        ? { ...start, value: start.value satisfies StartPath }
        : null,
    goal: toAnswer(obj.goal),
  };
};

/** The active workspace's onboarding answers (start path, goal). */
export const answersService = {
  get(orgId?: string, signal?: AbortSignal): Promise<WorkspaceAnswers> {
    return request(
      { method: "GET", url: "/onboarding/answers", signal },
      orgId
    ).then(toWorkspaceAnswers);
  },

  set(
    body: SetWorkspaceAnswersBody,
    orgId?: string
  ): Promise<WorkspaceAnswers> {
    return request(
      { method: "PUT", url: "/onboarding/answers", data: body },
      orgId
    ).then(toWorkspaceAnswers);
  },
};
