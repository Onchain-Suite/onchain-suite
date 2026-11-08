"use client";

import { CheckIcon, ClipboardIcon } from "@heroicons/react/20/solid";
import { useEffect, useState } from "react";

/** Copy button laid over a code block. The block itself stays server-rendered. */
export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      className="blog-code-copy"
      onClick={() => {
        navigator.clipboard
          .writeText(code)
          .then(() => setCopied(true))
          .catch(() => undefined);
      }}
      aria-label={copied ? "Code copied" : "Copy code"}
    >
      {copied ? (
        <CheckIcon aria-hidden="true" className="size-3.5" />
      ) : (
        <ClipboardIcon aria-hidden="true" className="size-3.5" />
      )}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
