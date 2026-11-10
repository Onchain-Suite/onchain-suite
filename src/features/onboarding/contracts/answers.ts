import type { StartPath } from "../utils/start-path";

/*
 * `GET/PUT /onboarding/answers` (backend onboarding/answers, 2026-11-10): the
 * active workspace's onboarding answers. Types only.
 */

/** Where an answer was given, recorded for onboarding analysis. */
export type AnswerSource = "onboarding" | "home" | "settings";

/** One stored answer, with when and where it was last set. */
export interface StoredAnswer<V extends string = string> {
  value: V;
  /** ISO timestamp of the last set. */
  setAt: string;
  source: AnswerSource;
}

/** Null for an answer the workspace has never given. */
export interface WorkspaceAnswers {
  /** What the team has today; the backend drops any value that is not one of the three. */
  startPath: StoredAnswer<StartPath> | null;
  /** The one thing that counts as a win: a goal id (e.g. "signup", "deposit"). */
  goal: StoredAnswer | null;
}

/** Send only the answers being set. Owners, admins and editors may set; viewers get 403. */
export interface SetWorkspaceAnswersBody {
  startPath?: StartPath;
  /** Lowercase id, up to 40 characters of a-z, 0-9, `_` and `-`. */
  goal?: string;
  source: AnswerSource;
}
