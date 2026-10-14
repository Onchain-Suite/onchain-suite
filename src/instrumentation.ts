import { logs } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

const processors =
  projectToken && host
    ? [
        new BatchLogRecordProcessor({
          exporter: new OTLPLogExporter({
            url: new URL("/i/v1/logs", host).toString(),
            headers: {
              Authorization: `Bearer ${projectToken}`,
              "Content-Type": "application/json",
            },
          }),
        }),
      ]
    : [];

export const loggerProvider = new LoggerProvider({
  resource: resourceFromAttributes({ "service.name": "onchain-suite" }),
  processors,
});

export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Missing config warns (dev only) instead of throwing, so the server still
  // boots without the PostHog keys - the log exporter just stays inert.
  if ((!projectToken || !host) && process.env.NODE_ENV === "development") {
    console.warn(
      "[posthog] NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN and NEXT_PUBLIC_POSTHOG_HOST are not set; server log export is disabled."
    );
    return;
  }

  logs.setGlobalLoggerProvider(loggerProvider);
}
