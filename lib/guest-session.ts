import "server-only";

import { cookies } from "next/headers";
import {
  cookieOptions,
  GUEST_CHALLENGE_COOKIE,
  GUEST_COOKIE,
  GUEST_ENROLL_COOKIE,
  GUEST_PIN_COOKIE,
  signGuestToken,
} from "@/lib/auth-token";
import { markShareUsed } from "@/lib/data";

const WEEK = 60 * 60 * 24 * 7;

export async function openGuestSession(tripId: string, shareId: string, gate: number, email: string) {
  const jwt = await signGuestToken(tripId, shareId, gate, email);
  const jar = await cookies();
  jar.set(GUEST_COOKIE, jwt, cookieOptions(WEEK));
  jar.set(GUEST_PIN_COOKIE, "", cookieOptions(0));
  jar.set(GUEST_ENROLL_COOKIE, "", cookieOptions(0));
  jar.set(GUEST_CHALLENGE_COOKIE, "", cookieOptions(0));
  await markShareUsed(shareId);
  return `/guest/${tripId}`;
}
