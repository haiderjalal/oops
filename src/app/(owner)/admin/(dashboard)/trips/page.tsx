import type { Metadata } from "next";

import { TripManager } from "@/components/admin/TripManager";
import { getAdminTrips } from "@/features/admin/queries";

export const metadata: Metadata = { title: "Trips" };

export default async function TripsPage() {
  const trips = await getAdminTrips();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-4xl">Trips</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Group places into journeys. Trips become chapters on the timeline and dashed routes
          between stops on the globe.
        </p>
      </header>
      <TripManager
        trips={trips.map((trip) => ({
          id: trip.id,
          title: trip.title,
          slug: trip.slug,
          startDate: trip.startDate,
          endDate: trip.endDate,
          description: trip.description,
          status: trip.status,
          isDemo: trip.isDemo,
          placeCount: trip.placeCount,
        }))}
      />
    </div>
  );
}
