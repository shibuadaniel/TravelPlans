"use server";

import { getCurrentUser } from "@/lib/current";
import { clearUserAvatar, deleteOwnedTrips, deleteUserProfile, getBundle, listGuestEmails, listMembers, listShareLinks, listTripsForUser, replaceUserAvatar, userAvatar } from "@/lib/data";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { removeStoredFile, storeAvatar } from "@/lib/uploads";
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
      guestEmails: item.role === "owner" ? await listGuestEmails(item.id) : [],
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

export async function saveProfilePhoto(formData: FormData): Promise<Result<{ saved: true }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a photo." };
  try {
    const stored = await storeAvatar(file);
    const previous = await replaceUserAvatar(user.id, stored.key, stored.mime);
    if (previous && previous !== stored.key) await removeStoredFile(previous);
    return { ok: true, data: { saved: true } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save the photo." };
  }
}

export async function removeProfilePhoto(): Promise<Result<{ saved: true }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };
  const previous = await clearUserAvatar(user.id);
  if (previous) await removeStoredFile(previous);
  return { ok: true, data: { saved: true } };
}

export async function deleteAccount(): Promise<Result<{ href: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };
  const avatar = await userAvatar(user.id);
  await deleteOwnedTrips(user.id);
  if (avatar) await removeStoredFile(avatar.key);
  await deleteUserProfile(user.id);
  const admin = createServiceRoleClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: "Could not delete the account. Try again." };
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { ok: true, data: { href: "/auth/sign-in" } };
}
