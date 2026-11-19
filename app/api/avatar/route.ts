import { NextResponse } from "next/server";
import { GUEST_COOKIE, GUEST_PIN_COOKIE, verifyGuestPinToken, verifyGuestToken } from "@/lib/auth-token";
import { canReadTrip, getCurrentUser } from "@/lib/current";
import { tripOwnerAvatar, userAvatar } from "@/lib/data";
import { readStoredFile } from "@/lib/uploads";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestedTrip = new URL(request.url).searchParams.get("trip");
  const jar = await cookies();
  const pending = await verifyGuestPinToken(jar.get(GUEST_PIN_COOKIE)?.value);
  const guest = await verifyGuestToken(jar.get(GUEST_COOKIE)?.value);
  const tripId = pending?.tripId ?? guest?.tripId;
  let avatar = null;
  if (requestedTrip) {
    if (!(await canReadTrip(requestedTrip))) return new NextResponse("Not found", { status: 404 });
    avatar = await tripOwnerAvatar(requestedTrip);
  } else {
    avatar = tripId ? await tripOwnerAvatar(tripId) : await userAvatar((await getCurrentUser())?.id ?? "");
  }
  if (!avatar) return new NextResponse("Not found", { status: 404 });
  const bytes = await readStoredFile(avatar.key);
  if (!bytes) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": avatar.mime,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
