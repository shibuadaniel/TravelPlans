import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  cookieOptions,
  GUEST_CHALLENGE_COOKIE,
  GUEST_ENROLL_COOKIE,
  signWebAuthnChallenge,
  verifyGuestEnrollToken,
  verifyWebAuthnChallenge,
} from "@/lib/auth-token";
import {
  guestEmailAllowed,
  listGuestPasskeyIds,
  saveGuestPasskey,
  shareIsActive,
  tripOwnerId,
  tripShareGate,
} from "@/lib/data";
import { openGuestSession } from "@/lib/guest-session";
import { encodeKey, passkeyUserId, webAuthnRelyingParty } from "@/lib/webauthn";

const FIVE_MINUTES = 60 * 5;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

async function currentEnrollment() {
  const enroll = await verifyGuestEnrollToken((await cookies()).get(GUEST_ENROLL_COOKIE)?.value);
  if (!enroll) return { ok: false as const, error: "Enter your email again." };
  if (!(await shareIsActive(enroll.shareId, enroll.tripId))) {
    return { ok: false as const, error: "This link is no longer active." };
  }
  const record = await tripShareGate(enroll.tripId);
  if (!record || record.gate !== enroll.gate) {
    return { ok: false as const, error: "Open the share link again." };
  }
  if (!(await guestEmailAllowed(enroll.tripId, enroll.email))) {
    return { ok: false as const, error: "That email can no longer open this trip." };
  }
  const ownerId = await tripOwnerId(enroll.tripId);
  if (!ownerId) return { ok: false as const, error: "This link is no longer active." };
  return { ok: true as const, enroll, ownerId };
}

export async function POST(request: Request) {
  const ready = await currentEnrollment();
  if (!ready.ok) return json({ ok: false, error: ready.error }, 400);
  const { rpID, rpName } = webAuthnRelyingParty(request);
  const existing = await listGuestPasskeyIds(ready.ownerId, ready.enroll.email);
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: ready.enroll.email,
    userID: passkeyUserId(ready.ownerId, ready.enroll.email),
    attestationType: "none",
    excludeCredentials: existing.map((id) => ({ id })),
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });
  const challenge = await signWebAuthnChallenge(options.challenge, "register");
  const response = json({ ok: true, options });
  response.cookies.set(GUEST_CHALLENGE_COOKIE, challenge, cookieOptions(FIVE_MINUTES));
  return response;
}

export async function PUT(request: Request) {
  const ready = await currentEnrollment();
  if (!ready.ok) return json({ ok: false, error: ready.error }, 400);
  const pending = await verifyWebAuthnChallenge((await cookies()).get(GUEST_CHALLENGE_COOKIE)?.value);
  if (!pending || pending.kind !== "register") {
    return json({ ok: false, error: "Save the passkey again." }, 400);
  }
  let body: RegistrationResponseJSON;
  try {
    body = (await request.json()) as RegistrationResponseJSON;
  } catch {
    return json({ ok: false, error: "Save the passkey again." }, 400);
  }
  const { rpID, origin } = webAuthnRelyingParty(request);
  try {
    const verified = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: pending.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
    if (!verified.verified) return json({ ok: false, error: "That passkey could not be saved." }, 400);
    const credential = verified.registrationInfo.credential;
    await saveGuestPasskey({
      credentialId: credential.id,
      ownerId: ready.ownerId,
      email: ready.enroll.email,
      publicKey: encodeKey(credential.publicKey),
      counter: credential.counter,
      gate: ready.enroll.gate,
    });
    const href = await openGuestSession(ready.enroll.tripId, ready.enroll.shareId, ready.enroll.gate, ready.enroll.email);
    return json({ ok: true, href });
  } catch {
    return json({ ok: false, error: "That passkey could not be saved." }, 400);
  }
}
