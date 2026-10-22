"use client";

import { findMergeTag } from "../../data/merge-tags";
import { EditorIcon } from "../editor-icon";
import { Button } from "@/shared/components/ui/button";

/** Beside the preview: what it shows, and the fallback for each recipient tag. */
export function PreviewPanel({
  who,
  dark,
  fallbacks,
  onFallback,
  onEdit,
}: {
  who: string;
  dark: boolean;
  fallbacks: { key: string; fallback: string }[];
  onFallback: (key: string, fallback: string) => void;
  onEdit: () => void;
}) {
  return (
    <>
      <span className="eed-lbl">Preview</span>
      <p className="eed-hint">
        This is the HTML that will be sent, rendered for {who}.
      </p>
      <p className="eed-hint">
        Links and buttons are inactive here. Send yourself a test from the
        review step to click through.
      </p>
      {dark && (
        <p className="eed-hint">
          Dark mode shows the email as apps that invert colours do. Check that
          logos and coloured text still read.
        </p>
      )}
      {fallbacks.length > 0 && (
        <div className="eed-fallbacks">
          <span className="eed-lbl">If we don&apos;t know it</span>
          {fallbacks.map(({ key, fallback }) => {
            const label = findMergeTag(key)?.label ?? key;
            return (
              <label key={key} className="eed-fb">
                <span>{label}</span>
                <input
                  value={fallback}
                  placeholder="Leave blank"
                  aria-label={`Fallback for ${label}`}
                  onChange={(e) => onFallback(key, e.target.value)}
                />
              </label>
            );
          })}
          <p className="eed-hint">
            Shown instead when someone has no value, so &ldquo;Hi {"{{ name }}"}
            &rdquo; reads &ldquo;Hi there&rdquo;, not &ldquo;Hi &rdquo;.
          </p>
        </div>
      )}
      <Button variant="outline" size="sm" onClick={onEdit}>
        <EditorIcon name="pen-line" size={14} />
        Back to editing
      </Button>
    </>
  );
}
