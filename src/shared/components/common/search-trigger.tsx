"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Bowser from "bowser";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

interface SearchTriggerProps {
  onClick: () => void;
}

export function SearchTrigger({ onClick }: SearchTriggerProps) {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    const browser = Bowser.getParser(window.navigator.userAgent);

    setIsMac(browser.getOS().name === "macOS");
  }, []);

  return (
    <Button
      variant="outline"
      aria-label="Search"
      className="bg-muted/50 text-muted-foreground relative h-9 w-9 justify-center rounded-md p-0 text-sm font-normal shadow-none sm:w-40 sm:justify-start sm:px-3 sm:pr-12 lg:w-64"
      onClick={onClick}
    >
      <MagnifyingGlassIcon
        className="h-4 w-4 shrink-0 sm:mr-2"
        aria-hidden="true"
      />
      <span className="hidden sm:inline-flex">Search...</span>
      <kbd className="bg-muted pointer-events-none absolute top-2 right-1.5 hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex">
        <span className="text-xs">{isMac ? "⌘" : "Ctrl"}</span>K
      </kbd>
    </Button>
  );
}
