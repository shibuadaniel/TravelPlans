"use server";

import { getCurrentUser } from "@/lib/current";
import { deleteOwnedTrips, deleteUserProfile, getBundle, listMembers, listShareLinks, listTripsForUser } from "@/lib/data";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Result } from "@/lib/types";

export async function exportAccount(): Promise<Result<{ filename: string; body: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };
  const listed = await listTripsForUser(user.id);
  const trips = [];
  for (const item of listed) {
    const bundle = await getBundle(item.id, item.role);
    if (!bundle) continue;
    trips.push({
      ...bundle,
      shareLinks: item.role === "owner" ? await listShareLinks(item.id) : [],
      members: item.role === "owner" ? await listMembers(item.id) : [],
    });
  }
  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      profile: { email: user.email, name: user.name },
      trips,
    },
    null,
    2,
  );
  return { ok: true, data: { filename: "where-are-we.json", body } };
}

export async function deleteAccount(): Promise<Result<{ href: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };
  await deleteOwnedTrips(user.id);
  await deleteUserProfile(user.id);
  const admin = createServiceRoleClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: "Could not delete the account. Try again." };
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { ok: true, data: { href: "/auth/sign-in" } };
}
