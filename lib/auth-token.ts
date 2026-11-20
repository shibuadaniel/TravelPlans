import { SignJWT, jwtVerify } from "jose";

export const USER_COOKIE = "session";
export const GUEST_COOKIE = "guest_trip";
export const GUEST_PIN_COOKIE = "guest_pin";
export const GUEST_ENROLL_COOKIE = "guest_enroll";
export const GUEST_CHALLENGE_COOKIE = "guest_webauthn";

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

export async function signGuestToken(tripId: string, shareId: string, gate: number) {
  return new SignJWT({ typ: "guest", tripId, shareId, gate })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyGuestToken(token: string | undefined) {
  if (!token || !process.env.SESSION_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.typ !== "guest") return null;
    const { tripId, shareId, gate } = payload;
    if (typeof tripId !== "string" || typeof shareId !== "string" || typeof gate !== "number") return null;
    return { tripId, shareId, gate };
  } catch {
    return null;
  }
}

export async function signGuestPinToken(tripId: string, shareId: string, gate: number) {
  return new SignJWT({ typ: "guest-pin", tripId, shareId, gate })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret());
}

export async function verifyGuestPinToken(token: string | undefined) {
  if (!token || !process.env.SESSION_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.typ !== "guest-pin") return null;
    const { tripId, shareId, gate } = payload;
    if (typeof tripId !== "string" || typeof shareId !== "string" || typeof gate !== "number") return null;
    return { tripId, shareId, gate };
  } catch {
    return null;
  }
}

export async function signGuestEnrollToken(tripId: string, shareId: string, gate: number, email: string) {
  return new SignJWT({ typ: "guest-enroll", tripId, shareId, gate, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret());
}

export async function verifyGuestEnrollToken(token: string | undefined) {
  if (!token || !process.env.SESSION_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.typ !== "guest-enroll") return null;
    const { tripId, shareId, gate, email } = payload;
    if (typeof tripId !== "string" || typeof shareId !== "string" || typeof gate !== "number" || typeof email !== "string") {
      return null;
    }
    return { tripId, shareId, gate, email };
  } catch {
    return null;
  }
}

export async function signWebAuthnChallenge(challenge: string, kind: "register" | "login") {
  return new SignJWT({ typ: "webauthn", challenge, kind })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret());
}

export async function verifyWebAuthnChallenge(token: string | undefined) {
  if (!token || !process.env.SESSION_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.typ !== "webauthn") return null;
    const { challenge, kind } = payload;
    if (typeof challenge !== "string" || (kind !== "register" && kind !== "login")) return null;
    return { challenge, kind };
  } catch {
    return null;
  }
}
