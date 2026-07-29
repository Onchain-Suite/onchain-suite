import { AuthLayout } from "@/features/core/auth/components/shared/auth-layout";
import { VerifyAccountView } from "@/features/core/auth/components/verify-account-view";

export const dynamic = "force-dynamic";

export default function VerifyAccountPage() {
  return (
    <AuthLayout>
      <VerifyAccountView />
    </AuthLayout>
  );
}
