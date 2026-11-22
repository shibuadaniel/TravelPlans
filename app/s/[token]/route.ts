import { NextResponse, type NextRequest } from "next/server";
import { cookieOptions, GUEST_PIN_COOKIE, signGuestPinToken } from "@/lib/auth-token";
import { findActiveShare, tripShareGate } from "@/lib/data";

const TEN_MINUTES = 60 * 10;

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const share = await findActiveShare(token);
  if (!share) {
    return NextResponse.redirect(new URL("/s/invalid", request.url));
  }
  const gate = await tripShareGate(share.tripId);
  if (!gate) {
    return NextResponse.redirect(new URL("/s/invalid", request.url));
  }
  const jwt = await signGuestPinToken(share.tripId, share.id, gate.gate);
  const response = NextResponse.redirect(new URL("/guest/pin", request.url));
  response.cookies.set(GUEST_PIN_COOKIE, jwt, cookieOptions(TEN_MINUTES));
  return response;
}
