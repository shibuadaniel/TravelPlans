import { GuestPinForm } from "@/components/guest-pin-form";
import { InvalidShare } from "@/components/invalid-share";
import { GUEST_PIN_COOKIE, verifyGuestPinToken } from "@/lib/auth-token";
import { cookies } from "next/headers";

export const metadata = { title: "Where are we?" };

export default async function GuestPinPage() {
  const pending = await verifyGuestPinToken((await cookies()).get(GUEST_PIN_COOKIE)?.value);
  if (!pending) return <InvalidShare />;
  return <GuestPinForm />;
}
