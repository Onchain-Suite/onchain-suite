import type { Metadata } from "next";
import { type ReactNode } from "react";

import { GuestGuard } from "@/lib/guard";

// Auth pages (sign-in/up, password reset) are never indexed — behind the
// robots.txt disallow, this keeps them out of the index if ever crawled.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const GuestLayout = ({ children }: { children: ReactNode }) => {
  return <GuestGuard>{children}</GuestGuard>;
};

export default GuestLayout;
