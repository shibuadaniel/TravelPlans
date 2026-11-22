import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TripEditor } from "@/components/trip-editor";
import { requireUser } from "@/lib/current";
import { getAccessibleBundle, listGuestEmails, listMembers, listShareLinks } from "@/lib/data";
import { displayDestination } from "@/lib/format";
import { EDIT_STEPS, type EditStep } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const bundle = await getAccessibleBundle(user.id, id);
  return { title: bundle ? `Edit ${displayDestination(bundle.trip.destination)}` : "Edit trip" };
}

function parseStep(value: string | undefined, allowShare: boolean): EditStep {
  const allowed = EDIT_STEPS.filter((step) => allowShare || step !== "share");
  if (value && (allowed as readonly string[]).includes(value)) return value as EditStep;
  return "overview";
}

export default async function EditTripPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { id } = await params;
  const { step } = await searchParams;
  const user = await requireUser();
  const bundle = await getAccessibleBundle(user.id, id);
  if (!bundle) notFound();
  const shareLinks = bundle.trip.role === "owner" ? await listShareLinks(id) : [];
  const members = bundle.trip.role === "owner" ? await listMembers(id) : [];
  return (
    <TripEditor
      bundle={bundle}
      initialStep={parseStep(step, bundle.trip.role === "owner")}
      shareLinks={shareLinks}
      members={members}
      guestEmails={bundle.trip.role === "owner" ? await listGuestEmails(id) : []}
    />
  );
}
