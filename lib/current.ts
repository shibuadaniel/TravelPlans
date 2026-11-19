import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GUEST_COOKIE, verifyGuestToken } from "@/lib/auth-token";
import { findUserById, getRole, shareIsActive } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return await findUserById(data.user.id);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  return user;
}

export async function readGuestSession() {
  const token = (await cookies()).get(GUEST_COOKIE)?.value;
  return verifyGuestToken(token);
}

export async function canReadTrip(tripId: string) {
  const user = await getCurrentUser();
  if (user && (await getRole(user.id, tripId))) return true;
  const guest = await readGuestSession();
  if (!guest || guest.tripId !== tripId) return false;
  return await shareIsActive(guest.shareId, tripId);
}
