"use server";

import { cookies } from "next/headers";
import { cookieOptions, GUEST_ENROLL_COOKIE, GUEST_PIN_COOKIE, signGuestEnrollToken, verifyGuestPinToken } from "@/lib/auth-token";
import { getCurrentUser } from "@/lib/current";
import { guestEmailAllowed, normalizeGuestEmail, saveSharePin, shareIsActive, tripSharePin } from "@/lib/data";
import { hashPin, normalizePin, verifyPin } from "@/lib/pin";
import { assertSharePinAllowed, recordSharePinFailure } from "@/lib/rate-limit";
import type { Result } from "@/lib/types";

const TEN_MINUTES = 60 * 10;

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

export async function submitSharePin(email: string, pin: string): Promise<Result<{ step: "passkey" }>> {
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
  const normalized = normalizeGuestEmail(email);
  const entered = normalizePin(pin);
  const emailOk = normalized ? await guestEmailAllowed(pending.tripId, normalized) : false;
  const pinOk = Boolean(entered && verifyPin(entered, record.pinHash));
  if (!emailOk || !pinOk || !normalized) {
    await recordSharePinFailure(pending.shareId);
    return { ok: false, error: "That email or PIN is incorrect." };
  }
  const enroll = await signGuestEnrollToken(pending.tripId, pending.shareId, record.gate, normalized);
  (await cookies()).set(GUEST_ENROLL_COOKIE, enroll, cookieOptions(TEN_MINUTES));
  return { ok: true, data: { step: "passkey" } };
}
