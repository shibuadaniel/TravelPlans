"use server";

import { cookies } from "next/headers";
import { cookieOptions, GUEST_COOKIE, GUEST_PIN_COOKIE, signGuestToken, verifyGuestPinToken } from "@/lib/auth-token";
import { getCurrentUser } from "@/lib/current";
import { markShareUsed, saveSharePin, shareIsActive, tripSharePin } from "@/lib/data";
import { hashPin, normalizePin, verifyPin } from "@/lib/pin";
import { assertSharePinAllowed, recordSharePinFailure } from "@/lib/rate-limit";
import type { Result } from "@/lib/types";

const WEEK = 60 * 60 * 24 * 7;

export async function setSharePin(pin: string, confirmation: string): Promise<Result<{ saved: true }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };
  const next = normalizePin(pin);
  if (!next || next !== confirmation.trim()) {
    return { ok: false, error: "Use 4 to 8 digits, and enter the same PIN twice." };
  }
  await saveSharePin(user.id, hashPin(next));
  return { ok: true, data: { saved: true } };
}

export async function submitSharePin(pin: string): Promise<Result<{ href: string }>> {
  const pending = await verifyGuestPinToken((await cookies()).get(GUEST_PIN_COOKIE)?.value);
  if (!pending) return { ok: false, error: "Open the share link again." };
  if (!(await shareIsActive(pending.shareId, pending.tripId))) {
    return { ok: false, error: "This link is no longer active." };
  }
  const record = await tripSharePin(pending.tripId);
  if (!record || record.gate !== pending.gate) {
    return { ok: false, error: "The PIN changed. Open the share link again." };
  }
  const allowed = await assertSharePinAllowed(pending.shareId);
  if (!allowed.ok) return allowed;
  const entered = normalizePin(pin);
  if (!entered || !verifyPin(entered, record.pinHash)) {
    await recordSharePinFailure(pending.shareId);
    return { ok: false, error: "That PIN is incorrect." };
  }
  const jwt = await signGuestToken(pending.tripId, pending.shareId, record.gate);
  const cookieStore = await cookies();
  cookieStore.set(GUEST_COOKIE, jwt, cookieOptions(WEEK));
  cookieStore.set(GUEST_PIN_COOKIE, "", cookieOptions(0));
  await markShareUsed(pending.shareId);
  return { ok: true, data: { href: `/guest/${pending.tripId}` } };
}
