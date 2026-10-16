import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

import { isJsonObject } from "@/lib/utils";

export const API_BASE_URL = "/api/v1";

const SILENT_ERROR_HEADER = "x-onchain-silent-error";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  // Safety net so no request hangs forever. A stalled request used to leave
  // React Query stuck in `pending`, which froze gated UI (e.g. the dashboard
  // skeleton) until a manual reload. Long/streaming calls (agent, enrichment)
  // pass their own larger `timeout` per-request and override this.
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - no longer needs to call getSession on every request
// which was causing 429 Too Many Requests errors.
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // Handle specific status codes
    const configHeaders = (
      error as unknown as { config?: { headers?: unknown } }
    ).config?.headers;
    const silentHeaderValue =
      configHeaders &&
      typeof (configHeaders as { get?: unknown }).get === "function"
        ? (configHeaders as { get: (key: string) => unknown }).get(
            SILENT_ERROR_HEADER
          )
        : isJsonObject(configHeaders)
          ? configHeaders[SILENT_ERROR_HEADER]
          : undefined;
    const isSilent =
      silentHeaderValue === "1" ||
      silentHeaderValue === 1 ||
      silentHeaderValue === true;

    if (error.response) {
      const { data, status } = error.response;
      const responseData: unknown = data;
      const dataObj = isJsonObject(responseData) ? responseData : undefined;
      const nestedError = isJsonObject(dataObj?.error)
        ? dataObj.error
        : undefined;
      const message =
        (typeof nestedError?.message === "string"
          ? nestedError.message
          : undefined) ??
        (typeof dataObj?.message === "string" ? dataObj.message : undefined) ??
        error.message;

      if (!isSilent && status !== 409) {
        console.error(`API Error [${status}]:`, message);
      }

      if (status === 401) {
        // Handle unauthorized (e.g., redirect to login if not already there)
        // Only if we are in the browser
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.startsWith("/auth")
        ) {
          // window.location.href = "/auth/signin";
        }
      }
    } else if (error.request) {
      if (isSilent) return Promise.reject(error);
      console.error("API Error: No response received from server");
    } else {
      if (isSilent) return Promise.reject(error);
      console.error("API Error:", error.message);
    }
    return Promise.reject(error);
  }
);
