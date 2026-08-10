"use client";

import {
  BoltIcon,
  DocumentTextIcon,
  InboxArrowDownIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { useMemo } from "react";

import { StatCard } from "@/ui/stat-card";

import type { CaptureForm } from "../forms.service";

/** Aggregate stats derived from the forms list - no extra fetches. */
export function FormStats({ forms }: { forms: CaptureForm[] }) {
  const stats = useMemo(() => {
    const total = forms.length;
    const active = forms.filter((f) => f.status === "active").length;
    const submissions = forms.reduce((sum, f) => sum + f.submissionCount, 0);
    const zk = forms.filter((f) => f.zkEnabled).length;
    return { total, active, submissions, zk };
  }, [forms]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total forms"
        value={stats.total}
        icon={DocumentTextIcon}
        variant="primary"
        description={`${stats.active} active`}
      />
      <StatCard
        title="Active"
        value={stats.active}
        icon={BoltIcon}
        variant="teal"
        description="Currently capturing"
      />
      <StatCard
        title="Submissions"
        value={stats.submissions.toLocaleString()}
        icon={InboxArrowDownIcon}
        variant="violet"
        description="All-time captures"
      />
      <StatCard
        title="ZK-encrypted"
        value={`${stats.zk}/${stats.total}`}
        icon={LockClosedIcon}
        variant="blue"
        description="Emails encrypted at rest"
      />
    </div>
  );
}
