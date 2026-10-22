/**
 * In-memory audience import/export jobs, used only when
 * USE_LOCAL_AUDIENCE_JOBS=1 outside production (local dev without the
 * backend job queue).
 */

export type AudienceImportExportFormat = "csv" | "json";
export type AudienceJobState =
  "queued" | "processing" | "completed" | "failed" | "cancelled";

export type AudienceImportError = {
  rowNumber?: number;
  key?: string;
  code?: string;
  message: string;
};

export type AudienceImportJob = {
  jobId: string;
  orgId: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  state: AudienceJobState;
  format: AudienceImportExportFormat;
  totalRows?: number;
  processedRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: AudienceImportError[];
};

export type AudienceExportJob = {
  jobId: string;
  orgId: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  state: AudienceJobState;
  format: AudienceImportExportFormat;
  processedRows: number;
  totalRows?: number;
  fileName: string;
  contentType: string;
  fileBytes: Uint8Array;
};

export const audienceImportJobs = new Map<string, AudienceImportJob>();
export const audienceExportJobs = new Map<string, AudienceExportJob>();
