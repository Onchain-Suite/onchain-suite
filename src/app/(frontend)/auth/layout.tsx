import { type ReactNode } from "react";

import { GuestGuard } from "@/lib/guard";

const GuestLayout = ({ children }: { children: ReactNode }) => {
  return <GuestGuard>{children}</GuestGuard>;
};

export default GuestLayout;
