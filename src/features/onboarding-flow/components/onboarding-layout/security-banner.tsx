import { XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function SecurityBanner({ onRemove }: { onRemove: () => void }) {
  return (
    <div className="bg-slate-700 px-4 py-3 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
            <span className="text-xs font-bold">!</span>
          </div>
          <p className="text-sm">
            <span className="font-medium">Reminder:</span> Onchain Suite will
            never call, email, or text you for your password or 1-time passcode.{" "}
            <Link
              href="/security"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              Learn more about security
            </Link>
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          onClick={onRemove}
          aria-label="Dismiss reminder"
        >
          <XMarkIcon aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
