import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  if (!user.onboardedAt) redirect("/onboarding");
  return children;
}
