import { GuestPinForm } from "@/components/guest-pin-form";
import { InvalidShare } from "@/components/invalid-share";
import {
  GUEST_CODE_COOKIE,
  GUEST_ENROLL_COOKIE,
  GUEST_PIN_COOKIE,
  verifyGuestCodeToken,
  verifyGuestEnrollToken,
  verifyGuestPinToken,
} from "@/lib/auth-token";
import { tripOwnerAvatar } from "@/lib/data";
import { cookies } from "next/headers";

export const metadata = { title: "Reveal" };

export default async function GuestPinPage() {
  const jar = await cookies();
  const pending = await verifyGuestPinToken(jar.get(GUEST_PIN_COOKIE)?.value);
  if (!pending) return <InvalidShare />;
  const enroll = await verifyGuestEnrollToken(jar.get(GUEST_ENROLL_COOKIE)?.value);
  const code = await verifyGuestCodeToken(jar.get(GUEST_CODE_COOKIE)?.value);
  const photo = await tripOwnerAvatar(pending.tripId);
  return (
    <GuestPinForm
      tripId={pending.tripId}
      hasPhoto={Boolean(photo)}
      needsPasskey={Boolean(enroll)}
      needsCode={Boolean(code) && !enroll}
      codeEmail={code?.email ?? ""}
    />
  );
}
