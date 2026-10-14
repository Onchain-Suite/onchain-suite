// Shown while a page's server work runs. Skeletons in the shape of the page, so nothing jumps when
// the real thing arrives.
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-2 px-4 lg:px-6"><Skeleton className="h-3 w-16" /><Skeleton className="h-7 w-96 max-w-full" /><Skeleton className="h-4 w-full max-w-2xl" /></div>
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @4xl/main:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-xl" />)}</div>
      <div className="px-4 lg:px-6"><Skeleton className="h-64 rounded-xl" /></div>
    </div>
  );
}
