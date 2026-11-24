import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShareTripButton } from "@/components/share-trip-button";
import { TripBriefing } from "@/components/trip-briefing";
import { requireUser } from "@/lib/current";
import { getAccessibleBundle, listGuestEmails, listMembers, listShareLinks } from "@/lib/data";
import { flightStatuses } from "@/lib/flight-status";
import { displayDestination } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const bundle = await getAccessibleBundle(user.id, id);
  return { title: bundle ? displayDestination(bundle.trip.destination) : "Trip" };
}

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const bundle = await getAccessibleBundle(user.id, id);
  if (!bundle) notFound();
  const [shareLinks, members, guestEmails] =
    bundle.trip.role === "owner"
      ? await Promise.all([listShareLinks(id), listMembers(id), listGuestEmails(id)])
      : [[], [], []];
  return (
    <TripBriefing
      bundle={bundle}
      mode={bundle.trip.role}
      ownerTools={
        bundle.trip.role === "owner" ? (
          <ShareTripButton
            tripId={bundle.trip.id}
            links={shareLinks}
            members={members}
            guestEmails={guestEmails}
          />
        ) : null
      }
      flightStatuses={await flightStatuses(bundle.flights)}
    />
  );
}
