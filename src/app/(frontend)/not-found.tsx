import { HomeIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { PRIVATE_ROUTES, publicRoutes } from "@/shared/config/app-routes";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <p className="text-7xl font-semibold tracking-tight text-primary/20">
          404
        </p>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
          Check the address, or head back to somewhere familiar.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild className="rounded-xl">
            <Link href={PRIVATE_ROUTES.DASHBOARD}>
              <Squares2X2Icon className="mr-2 h-4 w-4" aria-hidden="true" />
              Go to dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={publicRoutes.HOME}>
              <HomeIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              Back home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
