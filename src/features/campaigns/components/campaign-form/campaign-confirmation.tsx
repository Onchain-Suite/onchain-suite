"use client";
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import { parseTimeOfDay, zonedWallTimeToUtcDate } from "@/lib/timezone";

import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

interface ConfirmationPageProps {
  sendOption: "now" | "schedule";
  scheduleDate?: Date;
  scheduleTime?: string;
  timezone?: string;
}

export function ConfirmationPage({
  sendOption,
  scheduleDate,
  scheduleTime,
  timezone,
}: ConfirmationPageProps) {
  const [mounted, setMounted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setShowDetails(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const isScheduled = sendOption === "schedule";
  const tz =
    typeof timezone === "string" && timezone.length > 0 ? timezone : "UTC";

  const scheduledDateTimeLabel = useMemo(() => {
    if (!isScheduled) return "";
    if (!scheduleDate || !scheduleTime) return "";
    const { hour, minute } = parseTimeOfDay(scheduleTime);
    const utc = zonedWallTimeToUtcDate(
      {
        year: scheduleDate.getFullYear(),
        month: scheduleDate.getMonth() + 1,
        day: scheduleDate.getDate(),
        hour,
        minute,
      },
      tz
    );
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(utc);
  }, [isScheduled, scheduleDate, scheduleTime, tz]);

  const sentTimeLabel = useMemo(() => {
    if (isScheduled) return "";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date());
  }, [isScheduled, tz]);

  return (
    <div className="relative flex justify-center overflow-hidden bg-background px-2 py-8">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-20 -right-20 w-96 h-96 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl transition-transform duration-2000 ${mounted ? "translate-x-0 scale-100" : "translate-x-full scale-0"}`}
        />
        <div
          className={`absolute -bottom-20 -left-20 w-96 h-96 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl transition-transform duration-2000 delay-200 ${mounted ? "translate-x-0 scale-100" : "-translate-x-full scale-0"}`}
        />
        {mounted && (
          <>
            <SparklesIcon
              aria-hidden="true"
              className="absolute top-38 left-38 w-6 h-6 text-primary/20 animate-pulse"
            />
            <SparklesIcon
              aria-hidden="true"
              className="absolute bottom-48 right-40 w-4 h-4 text-primary/20 animate-pulse delay-300"
            />
            <SparklesIcon
              aria-hidden="true"
              className="absolute top-64 right-64 w-5 h-5 text-primary/20 animate-pulse delay-700"
            />
          </>
        )}
      </div>

      <div className="relative w-full max-w-lg">
        {/* Success Icon Animation */}
        <div className="mb-5 flex justify-center">
          <div
            className={`relative transition-all duration-700 ${mounted ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}
          >
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="relative rounded-full bg-primary p-4">
              {isScheduled ? (
                <CalendarIcon
                  aria-hidden="true"
                  className="w-6 h-6 text-primary-foreground animate-bounce-in"
                />
              ) : (
                <CheckCircleIcon
                  aria-hidden="true"
                  className="w-6 h-6 text-primary-foreground animate-bounce-in"
                />
              )}
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div
          className={`bg-card rounded-2xl shadow-xl shadow-primary/10 p-6 md:p-8 border border-border transition-all duration-700 delay-200 ${mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 text-balance">
              {isScheduled ? "Campaign Scheduled!" : "Campaign Sent!"}
            </h1>
            <p className="text-sm text-muted-foreground text-balance">
              {isScheduled
                ? "Your campaign is scheduled and ready to go"
                : "Your campaign has been sent successfully to all recipients"}
            </p>
          </div>

          {/* Details Card */}
          <div
            className={`bg-muted rounded-xl p-4 mb-5 border border-border transition-all duration-700 delay-500 ${showDetails ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
          >
            <div className="space-y-4">
              {isScheduled ? (
                <>
                  <div className="flex items-start gap-4">
                    <ClockIcon
                      aria-hidden="true"
                      className="w-5 h-5 text-primary mt-0.5 shrink-0"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-foreground mb-1">
                        Scheduled Date & Time
                      </div>
                      <div className="text-muted-foreground">
                        {scheduleDate && scheduleTime
                          ? scheduledDateTimeLabel
                          : "Friday, December 19, 2025 at 09:00 AM"}
                      </div>
                    </div>
                  </div>
                  {timezone && (
                    <div className="flex items-start gap-4">
                      <EnvelopeIcon
                        aria-hidden="true"
                        className="w-5 h-5 text-primary mt-0.5 shrink-0"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-foreground mb-1">
                          Timezone
                        </div>
                        <div className="text-muted-foreground">{timezone}</div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-start gap-4">
                  <EnvelopeIcon
                    aria-hidden="true"
                    className="w-5 h-5 text-primary mt-0.5 shrink-0"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-foreground mb-1">
                      Sent Time
                    </div>
                    <div className="text-muted-foreground">{sentTimeLabel}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div
            className={`bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-4 mb-5 transition-all duration-700 delay-700 ${showDetails ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
          >
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isScheduled ? (
                <>
                  <span className="font-semibold text-primary">
                    What happens next?
                  </span>{" "}
                  We&apos;ll send your campaign at the scheduled time. You can
                  manage or cancel this campaign from the Campaigns page.
                </>
              ) : (
                <>
                  <span className="font-semibold text-primary">
                    What happens next?
                  </span>{" "}
                  Your recipients will receive the campaign shortly. You can
                  track performance and engagement from your analytics
                  dashboard.
                </>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div
            className={`flex flex-col sm:flex-row gap-3 transition-all duration-700 delay-900 ${showDetails ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
          >
            <Button asChild className="flex-1 group">
              <Link href={PRIVATE_ROUTES.CAMPAIGNS}>
                View Campaigns
                <ArrowRightIcon
                  aria-hidden="true"
                  className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1"
                />
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 bg-transparent">
              <Link href={PRIVATE_ROUTES.NEW_CAMPAIGN}>
                Create Another Campaign
              </Link>
            </Button>
          </div>
        </div>

        {/* Footer Text */}
        <p
          className={`text-center text-sm text-muted-foreground mt-6 transition-all duration-700 delay-1000 ${showDetails ? "opacity-100" : "opacity-0"}`}
        >
          Need help? Visit our{" "}
          <Link href="/support" className="text-primary hover:underline">
            support center
          </Link>
        </p>
      </div>
    </div>
  );
}
