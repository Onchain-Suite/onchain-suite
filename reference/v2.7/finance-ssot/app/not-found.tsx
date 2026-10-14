// Root not-found, for routes outside the app frame. Minimal and on the tokens.
import Link from 'next/link';

export default function RootNotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="max-w-md rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="font-serif text-xl font-medium tracking-tight">There is nothing at this address.</h1>
        <p className="mt-2 text-sm text-muted-foreground">The link may be out of date.</p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">Back to the overview</Link>
      </div>
    </main>
  );
}
