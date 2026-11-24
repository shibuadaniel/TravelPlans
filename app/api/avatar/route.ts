import { NextResponse } from "next/server";
import { GUEST_COOKIE, GUEST_PIN_COOKIE, verifyGuestPinToken, verifyGuestToken } from "@/lib/auth-token";
import { canReadTrip, getCurrentUser } from "@/lib/current";
import { tripOwnerAvatar, userAvatar } from "@/lib/data";
import { readStoredFile } from "@/lib/uploads";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    return await readAvatar(request);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

async function readAvatar(request: Request) {
  const requestedTrip = new URL(request.url).searchParams.get("trip");
  const user = await getCurrentUser();
  const jar = await cookies();
  const pending = await verifyGuestPinToken(jar.get(GUEST_PIN_COOKIE)?.value);
  const guest = await verifyGuestToken(jar.get(GUEST_COOKIE)?.value);
  const tripId = pending?.tripId ?? guest?.tripId;
  let avatar = null;
  if (requestedTrip) {
    if (!(await canReadTrip(requestedTrip))) return new NextResponse("Not found", { status: 404 });
    avatar = await tripOwnerAvatar(requestedTrip);
  } else if (user) {
    avatar = await userAvatar(user.id);
  } else if (tripId) {
    avatar = await tripOwnerAvatar(tripId);
  }
  if (!avatar) return new NextResponse("Not found", { status: 404 });
  const bytes = await readStoredFile(avatar.key);
  if (!bytes) return new NextResponse("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": avatar.mime,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
