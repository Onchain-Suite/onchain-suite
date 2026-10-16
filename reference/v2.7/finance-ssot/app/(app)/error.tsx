'use client';
// The error boundary for a page inside the frame: what failed in plain words, a reference for the
// logs and a way onward. Never a stack trace, and never a blank screen.
import { useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <>
      <PageHeader eyebrow="Something went wrong" question="This page could not load."
        answer={<>Something it needed did not answer, or answered with something it did not expect. Nothing here is stale by accident: it is simply not shown.{error.digest ? ` Reference ${error.digest}.` : ''}</>} />
      <div className="flex gap-2 px-4 lg:px-6">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/" />}>Back to the start</Button>
      </div>
    </>
  );
}
