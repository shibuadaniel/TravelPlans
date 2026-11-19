"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current";
import { completeOnboarding as saveOnboarding, findUserById, insertUser } from "@/lib/data";
import { safeInternalPath } from "@/lib/format";
import { assertAuthAttemptAllowed } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/lib/types";

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200;
}

export async function registerAccount(email: string, password: string): Promise<Result<{ href: string }>> {
  const normalized = email.trim().toLowerCase();
  if (!validEmail(normalized)) return { ok: false, error: "Enter a valid email address." };
  if (password.length < 8) return { ok: false, error: "Use at least 8 characters for the password." };
  if (password.length > 200) return { ok: false, error: "That password is too long." };
  const allowed = await assertAuthAttemptAllowed(normalized);
  if (!allowed.ok) return allowed;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email: normalized, password });
  if (error) return { ok: false, error: "Could not create the account. If you already have one, sign in." };
  if (!data.user) return { ok: false, error: "Could not create the account." };

  const existing = await findUserById(data.user.id);
  if (!existing) await insertUser(data.user.id, normalized);
  if (!data.session) {
    return { ok: false, error: "Check your email to confirm the account, then sign in." };
  }
  return { ok: true, data: { href: "/onboarding" } };
}

export async function signIn(
  email: string,
  password: string,
  nextPath: string,
): Promise<Result<{ href: string }>> {
  const normalized = email.trim().toLowerCase();
  const allowed = await assertAuthAttemptAllowed(normalized);
  if (!allowed.ok) return allowed;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: normalized, password });
  if (error || !data.user) return { ok: false, error: "Email or password is incorrect." };

  let profile = await findUserById(data.user.id);
  if (!profile) {
    await insertUser(data.user.id, normalized);
    profile = await findUserById(data.user.id);
  }
  const href = profile?.onboardedAt ? safeInternalPath(nextPath, "/") : "/onboarding";
  return { ok: true, data: { href } };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/sign-in");
}

export async function finishOnboarding(name: string, next: "trips" | "create"): Promise<Result<{ href: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Enter your name." };
  await saveOnboarding(user.id, trimmed);
  return { ok: true, data: { href: next === "create" ? "/trips/new" : "/" } };
}
