import { EnvelopeIcon, SparklesIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

import { Button } from "@/ui/button";

import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

export const NewUserFlow = () => {
  return (
    <div className="container mx-auto px-4 py-2 md:py-2 lg:py-2">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-6 xl:gap-10">
        {/* Left Content */}
        <div className="flex-1 w-full max-w-2xl lg:max-w-none space-y-6 lg:space-y-8 text-center lg:text-left">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground text-balance tracking-tight">
              Send your first email campaign using data-driven best practices
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground text-pretty leading-relaxed">
              Reach the right people with high-quality templates and AI-powered
              insights. We&apos;ll guide you through creating impactful
              campaigns that drive results.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
            <Link
              href={PRIVATE_ROUTES.NEW_CAMPAIGN}
              className="w-full sm:w-auto"
            >
              <Button
                size="lg"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-8 py-6 text-base font-medium shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-[1.02]"
              >
                <EnvelopeIcon aria-hidden="true" className="mr-2 h-5 w-5" />
                Send your first email campaign
              </Button>
            </Link>
            <Link
              href={PRIVATE_ROUTES.NEW_CAMPAIGN}
              className="w-full sm:w-auto"
            >
              <Button
                variant="ghost"
                size="lg"
                className="w-full text-foreground hover:text-foreground hover:bg-muted rounded-xl px-6 py-6 text-base font-medium transition-all duration-300 ease-in-out"
              >
                Build your own
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Illustration */}
        <div className="flex-1 w-full max-w-lg lg:max-w-none">
          <div className="relative">
            <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-accent/5 rounded-2xl blur-3xl" />
            <div className="relative bg-card border border-border rounded-2xl p-6 md:p-8 shadow-xl transition-all duration-300 ease-in-out hover:shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <SparklesIcon
                    aria-hidden="true"
                    className="h-5 w-5 text-primary"
                  />
                  <h3 className="text-lg font-semibold text-foreground">
                    Quick Start Templates
                  </h3>
                </div>

                {/* Template Cards */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      title: "Welcome Series",
                      color: "bg-chart-1/10 border-chart-1/20",
                    },
                    {
                      title: "Newsletter",
                      color: "bg-chart-2/10 border-chart-2/20",
                    },
                    {
                      title: "Product Launch",
                      color: "bg-chart-3/10 border-chart-3/20",
                    },
                    {
                      title: "Re-engagement",
                      color: "bg-chart-4/10 border-chart-4/20",
                    },
                  ].map((template) => (
                    <Link
                      key={template.title}
                      href={PRIVATE_ROUTES.NEW_CAMPAIGN}
                      aria-label={`Create campaign: ${template.title}`}
                      className={`${template.color} border rounded-xl p-4 transition-all duration-300 ease-in-out hover:scale-[1.03] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
                    >
                      <div className="aspect-4/3 bg-background/50 rounded-lg mb-2 flex items-center justify-center">
                        <EnvelopeIcon
                          aria-hidden="true"
                          className="h-6 w-6 text-muted-foreground"
                        />
                      </div>
                      <p className="text-sm font-medium text-foreground text-center">
                        {template.title}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
