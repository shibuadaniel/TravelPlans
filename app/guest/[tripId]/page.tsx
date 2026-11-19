import type { Metadata } from "next";
import { InvalidShare } from "@/components/invalid-share";
import { TripBriefing } from "@/components/trip-briefing";
import { readGuestSession } from "@/lib/current";
import { getBundle, shareIsActive } from "@/lib/data";
import { displayDestination } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ tripId: string }> }): Promise<Metadata> {
  const { tripId } = await params;
  const guest = await readGuestSession();
  if (!guest || guest.tripId !== tripId || !(await shareIsActive(guest.shareId, tripId))) {
    return { title: "Where are we?" };
  }
  const bundle = await getBundle(tripId, "collaborator");
  return { title: bundle ? displayDestination(bundle.trip.destination) : "Where are we?" };
}

export default async function GuestTripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const guest = await readGuestSession();
  if (!guest || guest.tripId !== tripId || !(await shareIsActive(guest.shareId, tripId))) {
    return <InvalidShare />;
  }
  const bundle = await getBundle(tripId, "collaborator");
  if (!bundle) return <InvalidShare />;
  return <TripBriefing bundle={bundle} mode="guest" />;
}
