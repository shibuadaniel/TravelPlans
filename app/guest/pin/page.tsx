import { GuestPinForm } from "@/components/guest-pin-form";
import { InvalidShare } from "@/components/invalid-share";
import { GUEST_ENROLL_COOKIE, GUEST_PIN_COOKIE, verifyGuestEnrollToken, verifyGuestPinToken } from "@/lib/auth-token";
import { tripOwnerAvatar } from "@/lib/data";
import { cookies } from "next/headers";

export const metadata = { title: "Where are we?" };

export default async function GuestPinPage() {
  const jar = await cookies();
  const pending = await verifyGuestPinToken(jar.get(GUEST_PIN_COOKIE)?.value);
  if (!pending) return <InvalidShare />;
  const enroll = await verifyGuestEnrollToken(jar.get(GUEST_ENROLL_COOKIE)?.value);
  const photo = await tripOwnerAvatar(pending.tripId);
  return <GuestPinForm tripId={pending.tripId} hasPhoto={Boolean(photo)} needsPasskey={Boolean(enroll)} />;
}
