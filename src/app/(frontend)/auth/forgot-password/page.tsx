import AuthContainer from "@/auth/pages";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return <AuthContainer initialView="forgot-password" />;
}
