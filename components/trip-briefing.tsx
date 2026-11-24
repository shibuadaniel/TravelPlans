"use client";

import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import { ItineraryTimeline } from "@/components/itinerary-timeline";
import { SectionAccordion } from "@/components/section-accordion";
import { CarsBody, FlightsBody, InsuranceBody, StaysBody } from "@/components/section-bodies";
import { TitleChrome } from "@/components/title-chrome";
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
      <Box sx={{ px: 2, pt: 1 }}>
        <SectionAccordion
          key="flights"
          title="Flights"
          defaultExpanded
          editHref={editable ? `/trips/${trip.id}/edit?step=flights` : undefined}
        >
          <FlightsBody flights={bundle.flights} statuses={flightStatuses} />
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
            <ItineraryTimeline bundle={bundle} editable={editable} flightStatuses={flightStatuses} />
          </SectionAccordion>
        ) : null}
      </Box>
    </>
  );
}
