"use server";

import { cookies } from "next/headers";
import {
  cookieOptions,
  GUEST_CODE_COOKIE,
  GUEST_ENROLL_COOKIE,
  GUEST_PIN_COOKIE,
  signGuestCodeToken,
  signGuestEnrollToken,
  verifyGuestCodeToken,
  verifyGuestPinToken,
} from "@/lib/auth-token";
import { guestEmailAllowed, normalizeGuestEmail, shareIsActive, tripShareGate } from "@/lib/data";
import { consumeEmailCode, createEmailCode, saveEmailCode } from "@/lib/email-code";
import { sendGuestCode } from "@/lib/mail";
import { assertSharePinAllowed, recordSharePinFailure } from "@/lib/rate-limit";
import type { Result } from "@/lib/types";

const TEN_MINUTES = 60 * 10;

export async function submitShareEmail(email: string): Promise<Result<{ step: "code" }>> {
  const pending = await verifyGuestPinToken((await cookies()).get(GUEST_PIN_COOKIE)?.value);
  if (!pending) return { ok: false, error: "Open the share link again." };
  if (!(await shareIsActive(pending.shareId, pending.tripId))) {
    return { ok: false, error: "This link is no longer active." };
  }
  const record = await tripShareGate(pending.tripId);
  if (!record || record.gate !== pending.gate) {
    return { ok: false, error: "Open the share link again." };
  }
  const allowed = await assertSharePinAllowed(pending.shareId);
  if (!allowed.ok) return allowed;
  const normalized = normalizeGuestEmail(email);
  if (!normalized || !(await guestEmailAllowed(pending.tripId, normalized))) {
    await recordSharePinFailure(pending.shareId);
    return { ok: false, error: "That email cannot open this trip." };
  }
  const token = await signGuestCodeToken(pending.tripId, pending.shareId, record.gate, normalized);
  const code = createEmailCode();
  try {
    await saveEmailCode(pending.tripId, pending.shareId, normalized, code);
    await sendGuestCode(normalized, code);
  } catch {
    return { ok: false, error: "The code could not be sent. Try again." };
  }
  (await cookies()).set(GUEST_CODE_COOKIE, token, cookieOptions(TEN_MINUTES));
  return { ok: true, data: { step: "code" } };
}

export async function submitShareCode(code: string): Promise<Result<{ step: "passkey" }>> {
  const pending = await verifyGuestCodeToken((await cookies()).get(GUEST_CODE_COOKIE)?.value);
  if (!pending) return { ok: false, error: "Enter your email again." };
  if (!(await shareIsActive(pending.shareId, pending.tripId))) {
    return { ok: false, error: "This link is no longer active." };
  }
  const record = await tripShareGate(pending.tripId);
  if (!record || record.gate !== pending.gate) {
    return { ok: false, error: "Open the share link again." };
  }
  if (!(await guestEmailAllowed(pending.tripId, pending.email))) {
    return { ok: false, error: "That email can no longer open this trip." };
  }
  const checked = await consumeEmailCode(pending.tripId, pending.email, code);
  if (!checked.ok) return checked;
  const enroll = await signGuestEnrollToken(pending.tripId, pending.shareId, pending.gate, pending.email);
  const jar = await cookies();
  jar.set(GUEST_ENROLL_COOKIE, enroll, cookieOptions(TEN_MINUTES));
  jar.set(GUEST_CODE_COOKIE, "", cookieOptions(0));
  return { ok: true, data: { step: "passkey" } };
}
