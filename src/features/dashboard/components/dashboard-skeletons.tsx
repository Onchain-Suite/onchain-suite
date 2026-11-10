import { Skeleton } from "@/components/ui/skeleton";

/**
 * Home's skeleton, extracted so the server `loading.tsx` and the client
 * `MainDashboard` render the SAME one and the route -> client handoff never
 * shows two different ones.
 *
 * Pure JSX (no client hooks) so both a server and a client component can use it.
 */

/** Home for a workspace in use: the to-do list beside the two side panels. */
export function DashboardTodaySkeleton() {
  return (
    <div
      className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"
      aria-hidden="true"
    >
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }, (_, i) => i).map((i) => (
          <Skeleton key={`todo-${i}`} className="h-[76px] w-full rounded-xl" />
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
