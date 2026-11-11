import { Button } from "@/components/ui/button";

/**
 * Shown in place of a run's controls when its status could not be read. A run
 * may be going on the server, so this offers a second look, not a Start.
 */
export function RunStatusError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-2" role="alert">
      <p className="text-sm text-foreground">
        Couldn&apos;t check whether a run is going.
      </p>
      <p className="text-xs text-muted-foreground">{message}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Check again
      </Button>
    </div>
  );
}
