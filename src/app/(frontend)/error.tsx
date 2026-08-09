"use client";

import { ErrorPage } from "@/components/meta-components";

export default function ErrorPageComponent({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorPage error={error} reset={reset} />;
}
