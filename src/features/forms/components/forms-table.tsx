"use client";

import { ClipboardIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns";
import { memo } from "react";
import { toast } from "sonner";

import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/table";

import type { CaptureForm } from "../forms.service";
import { statusBadgeVariant } from "./form-card";

/** Compact list view of forms; rows open the detail sheet. */
export const FormsTable = memo(function FormsTable({
  forms,
  onOpen,
}: {
  forms: CaptureForm[];
  onOpen: (form: CaptureForm) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Submissions</TableHead>
            <TableHead className="hidden md:table-cell">
              Last submission
            </TableHead>
            <TableHead className="hidden sm:table-cell">Security</TableHead>
            <TableHead className="w-[90px]" aria-label="Actions" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {forms.map((form) => (
            <TableRow
              key={form.id}
              onClick={() => onOpen(form)}
              className="cursor-pointer"
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {form.name}
                  </span>
                  {form.tag ? (
                    <Badge variant="secondary" className="text-[10px]">
                      {form.tag}
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={statusBadgeVariant(form.status)}>
                  {form.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {form.submissionCount.toLocaleString()}
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {form.lastSubmissionAt
                  ? formatDistanceToNow(new Date(form.lastSubmissionAt), {
                      addSuffix: true,
                    })
                  : "-"}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <div className="flex gap-1">
                  {form.zkEnabled ? (
                    <Badge variant="outline" className="gap-1">
                      <LockClosedIcon className="h-3 w-3" aria-hidden="true" />
                      ZK
                    </Badge>
                  ) : (
                    <Badge variant="secondary">ZK off</Badge>
                  )}
                  {form.apiConnected ? (
                    <Badge variant="outline">API</Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  aria-label={`Copy embed code for ${form.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard
                      .writeText(form.embedCode)
                      .catch(() => undefined);
                    toast.success("Embed code copied");
                  }}
                >
                  <ClipboardIcon
                    className="mr-1 h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                  Embed
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});
