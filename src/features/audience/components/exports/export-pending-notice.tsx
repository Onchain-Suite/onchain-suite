import { Clock01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

import { Icon } from "@/shared/components/common/hugeicon";

export const EXPORT_REQUESTS_HREF = "/settings?tab=exports";

/**
 * Shown in place of a download when `POST /audience/exports` held the export
 * for a second admin (more than 10,000 contacts).
 */
export function ExportPendingNotice({
  estimatedRows,
}: {
  estimatedRows: number | null;
}) {
  return (
    <div
      role="status"
      className="flex gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300"
    >
      <Icon icon={Clock01Icon} className="mt-0.5 size-5 shrink-0" />
      <div className="space-y-1">
        <p className="font-medium">
          Export waiting for approval by another admin
        </p>
        <p className="opacity-90">
          {estimatedRows !== null
            ? `This export has ${estimatedRows.toLocaleString()} contacts. `
            : ""}
          Exports of more than 10,000 contacts need a second owner or admin to
          approve them. The file is made as soon as they do.{" "}
          <Link href={EXPORT_REQUESTS_HREF} className="font-medium underline">
            See export requests
          </Link>
        </p>
      </div>
    </div>
  );
}
