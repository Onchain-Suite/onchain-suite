export interface TrackedImportJob {
  jobId: string;
  fileName?: string;
  createdAt?: string;
  state?: string;
  processedRows?: number;
  totalRows?: number;
  createdCount?: number;
  updatedCount?: number;
  errorCount?: number;
  notifyEmails?: string[];
  lastRateLimitedAt?: string;
  lastErrorMessage?: string;
  notifiedAt?: string;
  emailSentAt?: string;
}

export const TRACKED_IMPORT_JOBS_KEY = "onchain.audience.importJobs.v1";
export const IMPORT_HISTORY_KEY = "onchain.audience.importHistory.v1";

const safeParse = (raw: string | null): unknown => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const loadTrackedImportJobs = (): TrackedImportJob[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(TRACKED_IMPORT_JOBS_KEY);
  const parsed = safeParse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((x) => x && typeof x === "object")
    .map((x) => x as TrackedImportJob)
    .filter((x) => typeof x.jobId === "string" && x.jobId.length > 0);
};

export const saveTrackedImportJobs = (jobs: TrackedImportJob[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TRACKED_IMPORT_JOBS_KEY, JSON.stringify(jobs));
  window.dispatchEvent(new Event("onchain.importJobs"));
};

export const upsertTrackedImportJob = (job: TrackedImportJob) => {
  const jobs = loadTrackedImportJobs();
  const next = [
    job,
    ...jobs.filter((x) => String(x.jobId) !== String(job.jobId)),
  ].slice(0, 20);
  saveTrackedImportJobs(next);
};

export const removeTrackedImportJob = (jobId: string) => {
  const jobs = loadTrackedImportJobs();
  saveTrackedImportJobs(jobs.filter((x) => String(x.jobId) !== String(jobId)));
};

export const updateTrackedImportJob = (
  jobId: string,
  patch: Partial<TrackedImportJob>
) => {
  const jobs = loadTrackedImportJobs();
  const next = jobs.map((x) =>
    String(x.jobId) === String(jobId) ? { ...x, ...patch } : x
  );
  saveTrackedImportJobs(next);
};

export const updateImportHistoryEntry = (
  jobId: string,
  patch: Record<string, unknown>
) => {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(IMPORT_HISTORY_KEY);
  const parsed = safeParse(raw);
  const arr = Array.isArray(parsed) ? parsed : [];
  const next = arr.map((x) => {
    if (!x || typeof x !== "object") return x;
    const obj = x as Record<string, unknown>;
    if (String(obj.jobId ?? "") !== String(jobId)) return x;
    return { ...obj, ...patch };
  });
  window.localStorage.setItem(
    IMPORT_HISTORY_KEY,
    JSON.stringify(next.slice(0, 50))
  );
};
