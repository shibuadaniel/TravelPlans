import { SignJWT, jwtVerify } from "jose";

export const USER_COOKIE = "session";
export const GUEST_COOKIE = "guest_trip";

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(value);
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function signUserToken(userId: string) {
  return new SignJWT({ typ: "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function verifyUserToken(token: string | undefined) {
  if (!token || !process.env.SESSION_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.typ !== "user" || typeof payload.sub !== "string") return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export async function signGuestToken(tripId: string, shareId: string) {
  return new SignJWT({ typ: "guest", tripId, shareId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function verifyGuestToken(token: string | undefined) {
  if (!token || !process.env.SESSION_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.typ !== "guest") return null;
    const { tripId, shareId } = payload;
    if (typeof tripId !== "string" || typeof shareId !== "string") return null;
    return { tripId, shareId };
  } catch {
    return null;
  }
}
