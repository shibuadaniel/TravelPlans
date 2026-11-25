import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { notFound } from "next/navigation";
import { ShareTripButton } from "@/components/share-trip-button";
import { TripBriefing } from "@/components/trip-briefing";
import { requireUser } from "@/lib/current";
import { getAccessibleBundle, itineraryHiddenFromShare, listGuestEmails, listMembers, listShareLinks } from "@/lib/data";
import { flightStatuses, previewFlightStatuses } from "@/lib/flight-status";
import { displayDestination } from "@/lib/format";
import type { FlightStatusChip, TripBundle, TripRole } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const bundle = await getAccessibleBundle(user.id, id);
  return { title: bundle ? displayDestination(bundle.trip.destination) : "Trip" };
}

function TripView({
  bundle,
  mode,
  ownerTools,
  statuses,
}: {
  bundle: TripBundle;
  mode: TripRole;
  ownerTools: ReactNode;
  statuses: Record<string, FlightStatusChip>;
}) {
  return <TripBriefing bundle={bundle} mode={mode} ownerTools={ownerTools} flightStatuses={statuses} />;
}

async function TripWithLiveStatus({
  bundle,
  mode,
  ownerTools,
}: {
  bundle: TripBundle;
  mode: TripRole;
  ownerTools: ReactNode;
}) {
  return <TripView bundle={bundle} mode={mode} ownerTools={ownerTools} statuses={await flightStatuses(bundle.flights)} />;
}

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const bundle = await getAccessibleBundle(user.id, id);
  if (!bundle) notFound();
  const [shareLinks, members, guestEmails, hideItinerary] =
    bundle.trip.role === "owner"
      ? await Promise.all([listShareLinks(id), listMembers(id), listGuestEmails(id), itineraryHiddenFromShare(id)])
      : [[], [], [], false];
  const ownerTools =
    bundle.trip.role === "owner" ? (
      <ShareTripButton
        tripId={bundle.trip.id}
        links={shareLinks}
        members={members}
        guestEmails={guestEmails}
        hideItinerary={hideItinerary}
      />
    ) : null;
  const mode = bundle.trip.role;
  return (
    <Suspense fallback={<TripView bundle={bundle} mode={mode} ownerTools={ownerTools} statuses={previewFlightStatuses(bundle.flights)} />}>
      <TripWithLiveStatus bundle={bundle} mode={mode} ownerTools={ownerTools} />
    </Suspense>
  );
}
