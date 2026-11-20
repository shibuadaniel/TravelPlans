import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  cookieOptions,
  GUEST_CHALLENGE_COOKIE,
  GUEST_PIN_COOKIE,
  signWebAuthnChallenge,
  verifyGuestPinToken,
  verifyWebAuthnChallenge,
} from "@/lib/auth-token";
import {
  findGuestPasskey,
  guestEmailAllowed,
  shareIsActive,
  tripOwnerId,
  tripSharePin,
  updateGuestPasskeyCounter,
} from "@/lib/data";
import { openGuestSession } from "@/lib/guest-session";
import { decodeKey, webAuthnRelyingParty } from "@/lib/webauthn";

const FIVE_MINUTES = 60 * 5;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

async function currentLink() {
  const pending = await verifyGuestPinToken((await cookies()).get(GUEST_PIN_COOKIE)?.value);
  if (!pending) return { ok: false as const, error: "Open the share link again." };
  if (!(await shareIsActive(pending.shareId, pending.tripId))) {
    return { ok: false as const, error: "This link is no longer active." };
  }
  const record = await tripSharePin(pending.tripId);
  if (!record || record.gate !== pending.gate) {
    return { ok: false as const, error: "The PIN changed. Open the share link again." };
  }
  const ownerId = await tripOwnerId(pending.tripId);
  if (!ownerId) return { ok: false as const, error: "This link is no longer active." };
  return { ok: true as const, pending, ownerId, gate: record.gate };
}

export async function POST(request: Request) {
  const ready = await currentLink();
  if (!ready.ok) return json({ ok: false, error: ready.error }, 400);
  const { rpID } = webAuthnRelyingParty(request);
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
  });
  const challenge = await signWebAuthnChallenge(options.challenge, "login");
  const response = json({ ok: true, options });
  response.cookies.set(GUEST_CHALLENGE_COOKIE, challenge, cookieOptions(FIVE_MINUTES));
  return response;
}

export async function PUT(request: Request) {
  const ready = await currentLink();
  if (!ready.ok) return json({ ok: false, error: ready.error }, 400);
  const pending = await verifyWebAuthnChallenge((await cookies()).get(GUEST_CHALLENGE_COOKIE)?.value);
  if (!pending || pending.kind !== "login") {
    return json({ ok: false, error: "Use your passkey again." }, 400);
  }
  let body: AuthenticationResponseJSON;
  try {
    body = (await request.json()) as AuthenticationResponseJSON;
  } catch {
    return json({ ok: false, error: "Use your passkey again." }, 400);
  }
  const stored = await findGuestPasskey(body.id);
  if (!stored || stored.ownerId !== ready.ownerId || stored.gate !== ready.gate) {
    return json({ ok: false, error: "Enter your email and PIN on this device." }, 400);
  }
  if (!(await guestEmailAllowed(ready.pending.tripId, stored.email))) {
    return json({ ok: false, error: "That email can no longer open this trip." }, 400);
  }
  const { rpID, origin } = webAuthnRelyingParty(request);
  try {
    const verified = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: pending.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: stored.credentialId,
        publicKey: decodeKey(stored.publicKey),
        counter: stored.counter,
      },
    });
    if (!verified.verified) return json({ ok: false, error: "That passkey could not open this trip." }, 400);
    await updateGuestPasskeyCounter(stored.credentialId, verified.authenticationInfo.newCounter);
    const href = await openGuestSession(ready.pending.tripId, ready.pending.shareId, ready.gate);
    return json({ ok: true, href });
  } catch {
    return json({ ok: false, error: "That passkey could not open this trip." }, 400);
  }
}
