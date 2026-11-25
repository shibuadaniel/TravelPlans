import type { Metadata } from "next";
import { InvalidShare } from "@/components/invalid-share";
import { TripBriefing } from "@/components/trip-briefing";
import { guestCanRead } from "@/lib/current";
import { getBundle, itineraryHiddenFromShare } from "@/lib/data";
import { previewFlightStatuses } from "@/lib/flight-status";
import { displayDestination } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ tripId: string }> }): Promise<Metadata> {
  const { tripId } = await params;
  if (!(await guestCanRead(tripId))) {
    return { title: "Reveal" };
  }
  const bundle = await getBundle(tripId, "guest");
  return { title: bundle ? displayDestination(bundle.trip.destination) : "Reveal" };
}

export default async function GuestTripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  if (!(await guestCanRead(tripId))) {
    return <InvalidShare />;
  }
  const bundle = await getBundle(tripId, "guest");
  if (!bundle) return <InvalidShare />;
  const hideItinerary = await itineraryHiddenFromShare(tripId);
  const shared = hideItinerary ? { ...bundle, events: [] } : bundle;
  return (
    <TripBriefing
      bundle={shared}
      mode="guest"
      showItinerary={!hideItinerary}
      flightStatuses={previewFlightStatuses(bundle.flights)}
    />
  );
}
