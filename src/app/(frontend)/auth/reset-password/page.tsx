import AuthContainer from "@/auth/pages";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthContainer
      initialView="reset-password"
      resetToken={token ?? undefined}
    />
  );
}
