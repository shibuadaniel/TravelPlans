import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShareTripButton } from "@/components/share-trip-button";
import { TripBriefing } from "@/components/trip-briefing";
import { requireUser } from "@/lib/current";
import { getAccessibleBundle, listGuestEmails, listMembers, listShareLinks, userHasSharePin } from "@/lib/data";
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
  const shareLinks = bundle.trip.role === "owner" ? await listShareLinks(id) : [];
  const members = bundle.trip.role === "owner" ? await listMembers(id) : [];
  const pinReady = bundle.trip.role === "owner" ? await userHasSharePin(user.id) : false;
  const guestEmails = bundle.trip.role === "owner" ? await listGuestEmails(id) : [];
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
            pinReady={pinReady}
            guestEmails={guestEmails}
          />
        ) : null
      }
    />
  );
}
