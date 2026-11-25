"use client";

import Box from "@mui/material/Box";
import { useEffect, useState, type ReactNode } from "react";
import { ItineraryTimeline } from "@/components/itinerary-timeline";
import { SectionAccordion } from "@/components/section-accordion";
import { CarsBody, FlightsBody, InsuranceBody, StaysBody } from "@/components/section-bodies";
import { TitleChrome } from "@/components/title-chrome";
import { refreshFlightStatuses } from "@/lib/actions/flight-status";
import { travelReturnLabel } from "@/lib/format";
import type { FlightStatusChip, TripBundle } from "@/lib/types";

export function TripBriefing({
  bundle,
  mode,
  ownerTools = null,
  flightStatuses = {},
  showItinerary = true,
}: {
  bundle: TripBundle;
  mode: "owner" | "collaborator" | "guest";
  ownerTools?: ReactNode;
  flightStatuses?: Record<string, FlightStatusChip>;
  showItinerary?: boolean;
}) {
  const { trip } = bundle;
  const editable = mode !== "guest";
  const [statuses, setStatuses] = useState(flightStatuses);

  useEffect(() => {
    let cancel = false;
    void refreshFlightStatuses(bundle.flights).then((next) => {
      if (!cancel) setStatuses(next);
    });
    return () => {
      cancel = true;
    };
  }, [bundle.flights]);

  return (
    <>
      <TitleChrome
        backHref={editable ? "/" : undefined}
        backLabel="Back"
        title={trip.destination}
        subtitle={travelReturnLabel(trip.travelDate, trip.returnDate)}
        avatarSrc={`/api/avatar?trip=${trip.id}`}
        tint
        dateEditHref={editable ? `/trips/${trip.id}/edit?step=overview` : undefined}
        actions={mode === "owner" ? ownerTools : null}
      />
      <Box sx={{ px: 1, pt: 1 }}>
        <SectionAccordion
          key="flights"
          title="Flights"
          defaultExpanded
          editHref={editable ? `/trips/${trip.id}/edit?step=flights` : undefined}
        >
          <FlightsBody flights={bundle.flights} statuses={statuses} />
        </SectionAccordion>
        <SectionAccordion
          key="cars"
          title="Car rentals"
          editHref={editable ? `/trips/${trip.id}/edit?step=cars` : undefined}
        >
          <CarsBody cars={bundle.carRentals} />
        </SectionAccordion>
        <SectionAccordion
          key="stays"
          title="Stays"
          editHref={editable ? `/trips/${trip.id}/edit?step=stays` : undefined}
        >
          <StaysBody stays={bundle.stays} guest={!editable} />
        </SectionAccordion>
        <SectionAccordion key="insurance" title="Insurance" editHref={editable ? `/trips/${trip.id}/edit?step=insurance` : undefined}>
          <InsuranceBody insurance={bundle.insurance} documents={bundle.insuranceDocuments} guest={!editable} />
        </SectionAccordion>
        {showItinerary ? (
          <SectionAccordion key="itinerary" title="Itinerary">
            <ItineraryTimeline bundle={bundle} editable={editable} flightStatuses={statuses} />
          </SectionAccordion>
        ) : null}
      </Box>
    </>
  );
}
