import type { Metadata } from "next";
import { Suspense } from "react";
import { InvalidShare } from "@/components/invalid-share";
import { TripBriefing } from "@/components/trip-briefing";
import { guestCanRead } from "@/lib/current";
import { getBundle, itineraryHiddenFromShare } from "@/lib/data";
import { flightStatuses, previewFlightStatuses } from "@/lib/flight-status";
import { displayDestination } from "@/lib/format";
import type { TripBundle } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ tripId: string }> }): Promise<Metadata> {
  const { tripId } = await params;
  if (!(await guestCanRead(tripId))) {
    return { title: "Reveal" };
  }
  const bundle = await getBundle(tripId, "guest");
  return { title: bundle ? displayDestination(bundle.trip.destination) : "Reveal" };
}

function GuestView({ bundle, showItinerary, statuses }: { bundle: TripBundle; showItinerary: boolean; statuses: Awaited<ReturnType<typeof flightStatuses>> }) {
  return <TripBriefing bundle={bundle} mode="guest" showItinerary={showItinerary} flightStatuses={statuses} />;
}

async function GuestWithLiveStatus({ bundle, showItinerary }: { bundle: TripBundle; showItinerary: boolean }) {
  return <GuestView bundle={bundle} showItinerary={showItinerary} statuses={await flightStatuses(bundle.flights)} />;
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
  const showItinerary = !hideItinerary;
  return (
    <Suspense fallback={<GuestView bundle={shared} showItinerary={showItinerary} statuses={previewFlightStatuses(bundle.flights)} />}>
      <GuestWithLiveStatus bundle={shared} showItinerary={showItinerary} />
    </Suspense>
  );
}
