import type { Metadata } from "next";
import { InvalidShare } from "@/components/invalid-share";
import { TripBriefing } from "@/components/trip-briefing";
import { guestCanRead } from "@/lib/current";
import { getBundle } from "@/lib/data";

export const dynamic = "force-dynamic";
import { displayDestination } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ tripId: string }> }): Promise<Metadata> {
  const { tripId } = await params;
  if (!(await guestCanRead(tripId))) {
    return { title: "Where are we?" };
  }
  const bundle = await getBundle(tripId, "guest");
  return { title: bundle ? displayDestination(bundle.trip.destination) : "Where are we?" };
}

export default async function GuestTripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  if (!(await guestCanRead(tripId))) {
    return <InvalidShare />;
  }
  const bundle = await getBundle(tripId, "guest");
  if (!bundle) return <InvalidShare />;
  return <TripBriefing bundle={bundle} mode="guest" />;
}
