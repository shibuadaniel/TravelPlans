import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TripBriefing } from "@/components/trip-briefing";
import { requireUser } from "@/lib/current";
import { getAccessibleBundle, listMembers, listShareLinks } from "@/lib/data";
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
  return <TripBriefing bundle={bundle} mode={bundle.trip.role} shareLinks={shareLinks} members={members} />;
}
