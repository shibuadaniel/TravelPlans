import { NextResponse, type NextRequest } from "next/server";
import { cookieOptions, GUEST_COOKIE, signGuestToken } from "@/lib/auth-token";
import { redeemShare } from "@/lib/data";

const MONTH = 60 * 60 * 24 * 30;

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const share = await redeemShare(token);
  if (!share) {
    return NextResponse.redirect(new URL("/s/invalid", request.url));
  }
  const jwt = await signGuestToken(share.tripId, share.id);
  const response = NextResponse.redirect(new URL(`/guest/${share.tripId}`, request.url));
  response.cookies.set(GUEST_COOKIE, jwt, cookieOptions(MONTH));
  return response;
}
