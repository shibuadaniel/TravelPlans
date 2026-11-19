import { redirect } from "next/navigation";
import { OnboardingScreen } from "@/components/onboarding-screen";
import { getCurrentUser } from "@/lib/current";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  if (user.onboardedAt) redirect("/");
  return <OnboardingScreen />;
}
