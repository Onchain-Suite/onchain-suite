"use client";

import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";

import type { EmailSaveBlock } from "../utils/email-save-block";
import { saveBlockReason } from "../utils/email-save-block";
import { CheckRow } from "./presend-check-row";

interface SaveBlockedDialogProps {
  block: EmailSaveBlock | null;
  open: boolean;
  onClose: () => void;
}

/**
 * The editor's save was refused by a pre-send block. Nothing here can
 * override it: the only way forward is to edit the email, which the editor
 * keeps open with the user's content intact. Each check's copy is the
 * backend's; the shortened links are shown as text, never as links.
 */
export function SaveBlockedDialog({
  block,
  open,
  onClose,
}: SaveBlockedDialogProps) {
  if (!block) return null;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-lg"
        data-testid="save-blocked-dialog"
      >
        <DialogHeader>
          <DialogTitle>Not saved: {saveBlockReason(block)}</DialogTitle>
          <DialogDescription>
            Your edits are still in the editor. Fix this and the email saves on
            your next change.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {block.checks.map((check) => (
            <section key={check.code} className="space-y-2">
              <ul>
                <CheckRow
                  check={{
                    code: check.code,
                    outcome: "block",
                    message: check.message,
                    ...(check.fix ? { fix: check.fix } : {}),
                  }}
                />
              </ul>
              {check.links && check.links.length > 0 ? (
                <div className="space-y-1 pl-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    {check.links.length === 1
                      ? "Link to replace (highlighted in the email)"
                      : `${check.links.length} links to replace (highlighted in the email)`}
                  </p>
                  <ul
                    aria-label="Links to replace"
                    className="space-y-1 font-mono text-xs break-all text-foreground"
                  >
                    {check.links.map((link) => (
                      <li key={link}>{link}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            Back to the email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
