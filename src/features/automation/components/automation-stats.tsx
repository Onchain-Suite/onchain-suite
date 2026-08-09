import {
  BoltIcon,
  ChartBarIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { type ComponentType, type SVGProps } from "react";

interface AutomationStatsProps {
  stats: {
    active: number;
    entries: number;
    conversions: number;
    revenue: number;
  };
}

const formatRevenue = (value: number) => {
  if (value >= 1000)
    return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return `$${value.toLocaleString()}`;
};

export const AutomationStats = ({ stats }: AutomationStatsProps) => {
  const conversionRate =
    stats.entries > 0
      ? `${Math.round((stats.conversions / stats.entries) * 1000) / 10}%`
      : "-";

  const cards: {
    key: string;
    label: string;
    value: string;
    hint: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    highlight?: boolean;
  }[] = [
    {
      key: "active",
      label: "Active automations",
      value: stats.active.toLocaleString(),
      hint: "running now",
      icon: BoltIcon,
    },
    {
      key: "entries",
      label: "Total entries",
      value: stats.entries.toLocaleString(),
      hint: "wallets entered",
      icon: RectangleStackIcon,
    },
    {
      key: "conversions",
      label: "Conversions",
      value: stats.conversions.toLocaleString(),
      hint: `${conversionRate} conversion rate`,
      icon: CheckCircleIcon,
    },
    {
      key: "revenue",
      label: "Attributed revenue",
      value: formatRevenue(stats.revenue),
      hint: "from automations",
      icon: CurrencyDollarIcon,
      highlight: true,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.25 }}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="flex items-start justify-between">
              <Icon
                className="h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
              <ChartBarIcon
                className="h-4 w-4 text-muted-foreground/50"
                aria-hidden="true"
              />
            </div>
            <div className="mt-4">
              <div
                className={`text-2xl font-semibold tracking-tight ${
                  card.highlight ? "text-primary" : "text-foreground"
                }`}
              >
                {card.value}
              </div>
              <div className="mt-0.5 text-sm font-medium text-foreground/80">
                {card.label}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {card.hint}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
