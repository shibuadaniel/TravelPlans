import { TripList } from "@/components/trip-list";
import { requireUser } from "@/lib/current";
import { listTripsForUser } from "@/lib/data";
import { withPlacePhotos } from "@/lib/place-photo";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();
  const trips = await withPlacePhotos(await listTripsForUser(user.id));
  return <TripList trips={trips} />;
}
