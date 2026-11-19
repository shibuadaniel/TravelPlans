import { SignInForm } from "@/components/auth-screen";
import { safeInternalPath } from "@/lib/format";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <SignInForm nextPath={safeInternalPath(next, "/")} />;
}
