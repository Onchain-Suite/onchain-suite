import AuthContainer from "@/auth/pages";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return <AuthContainer initialView="signin" />;
}
