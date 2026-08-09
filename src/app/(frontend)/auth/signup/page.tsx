import AuthContainer from "@/auth/pages";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return <AuthContainer initialView="signup" />;
}
