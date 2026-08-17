import type { AudienceImportExportFormat } from "@/features/audience/audience.service";

export const TRACKED_IMPORT_JOBS_KEY = "onchain.audience.trackedImportJobs.v1";
export const IMPORT_HISTORY_KEY = "onchain.audience.importHistory.v1";

const safeParse = (raw: string | null): unknown => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const notifyJobsChanged = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("onchain.importJobs"));
};

type AudienceImportJobState =
  "queued" | "processing" | "completed" | "failed" | "cancelled";

export interface TrackedImportJob {
  jobId: string;
  fileName?: string;
  createdAt?: string;
  state?: AudienceImportJobState | string;
  notifyEmails?: string[];
  lastRateLimitedAt?: string;
  lastErrorMessage?: string;
  processedRows?: number;
  totalRows?: number;
  createdCount?: number;
  updatedCount?: number;
  errorCount?: number;
  notifiedAt?: string;
  emailSentAt?: string;
  [key: string]: unknown;
}

type ImportHistoryStatus =
  "queued" | "processing" | "completed" | "failed" | "cancelled";

export interface ImportHistoryEntry {
  jobId: string;
  fileName: string;
  format: AudienceImportExportFormat;
  createdAt: string;
  status: ImportHistoryStatus;
  processedRows?: number;
  totalRows?: number;
  createdCount?: number;
  updatedCount?: number;
  errorCount?: number;
  [key: string]: unknown;
}

const readTrackedJobs = (): TrackedImportJob[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(TRACKED_IMPORT_JOBS_KEY);
  const parsed = safeParse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((x): x is TrackedImportJob => x && typeof x === "object")
    .filter((x) => typeof x.jobId === "string" && x.jobId.length > 0)
    .slice(0, 200);
};

const writeTrackedJobs = (jobs: TrackedImportJob[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    TRACKED_IMPORT_JOBS_KEY,
    JSON.stringify(jobs.slice(0, 200))
  );
  notifyJobsChanged();
};

const readImportHistory = (): ImportHistoryEntry[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(IMPORT_HISTORY_KEY);
  const parsed = safeParse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((x): x is ImportHistoryEntry => x && typeof x === "object")
    .filter((x) => typeof x.jobId === "string" && x.jobId.length > 0)
    .slice(0, 200);
};

const writeImportHistory = (entries: ImportHistoryEntry[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    IMPORT_HISTORY_KEY,
    JSON.stringify(entries.slice(0, 200))
  );
  notifyJobsChanged();
};

export const loadTrackedImportJobs = (): TrackedImportJob[] => {
  return readTrackedJobs();
};

export const upsertTrackedImportJob = (job: TrackedImportJob) => {
  const jobId = String(job.jobId ?? "").trim();
  if (jobId.length === 0) return;
  const existing = readTrackedJobs();
  const next: TrackedImportJob[] = [
    { ...job, jobId },
    ...existing.filter((x) => String(x.jobId) !== jobId),
  ];
  writeTrackedJobs(next);
};

export const updateTrackedImportJob = (
  jobId: string,
  patch: Partial<TrackedImportJob>
) => {
  const id = String(jobId ?? "").trim();
  if (id.length === 0) return;
  const existing = readTrackedJobs();
  const next = existing.map((x) =>
    String(x.jobId) === id ? { ...x, ...patch, jobId: id } : x
  );
  writeTrackedJobs(next);
};

export const removeTrackedImportJob = (jobId: string) => {
  const id = String(jobId ?? "").trim();
  if (id.length === 0) return;
  const existing = readTrackedJobs();
  const next = existing.filter((x) => String(x.jobId) !== id);
  writeTrackedJobs(next);
};

export const updateImportHistoryEntry = (
  jobId: string,
  patch: Partial<ImportHistoryEntry>
) => {
  const id = String(jobId ?? "").trim();
  if (id.length === 0) return;
  const existing = readImportHistory();
  const found = existing.find((x) => String(x.jobId) === id);
  if (!found) return;
  const next = existing.map((x) =>
    String(x.jobId) === id ? { ...x, ...patch, jobId: id } : x
  );
  writeImportHistory(next);
};
