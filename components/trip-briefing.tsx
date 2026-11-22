"use client";

import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import { SectionAccordion } from "@/components/section-accordion";
import { CarsBody, CongregationsBody, FlightsBody, InsuranceBody, StaysBody } from "@/components/section-bodies";
import { TitleChrome } from "@/components/title-chrome";
import { travelReturnLabel } from "@/lib/format";
import type { TripBundle } from "@/lib/types";

export function TripBriefing({
  bundle,
  mode,
  ownerTools = null,
}: {
  bundle: TripBundle;
  mode: "owner" | "collaborator" | "guest";
  ownerTools?: ReactNode;
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
        actions={mode === "owner" ? ownerTools : null}
      />
      <Box sx={{ px: 2, pt: 1 }}>
        <SectionAccordion
          title="Flights"
          defaultExpanded
          editHref={editable ? `/trips/${trip.id}/edit?step=flights` : undefined}
        >
          <FlightsBody flights={bundle.flights} />
        </SectionAccordion>
        <SectionAccordion
          title="Car rentals"
          editHref={editable ? `/trips/${trip.id}/edit?step=cars` : undefined}
        >
          <CarsBody cars={bundle.carRentals} />
        </SectionAccordion>
        <SectionAccordion
          title="Stays"
          editHref={editable ? `/trips/${trip.id}/edit?step=stays` : undefined}
        >
          <StaysBody stays={bundle.stays} guest={!editable} />
        </SectionAccordion>
        <SectionAccordion title="Insurance" editHref={editable ? `/trips/${trip.id}/edit?step=insurance` : undefined}>
          <InsuranceBody insurance={bundle.insurance} documents={bundle.insuranceDocuments} guest={!editable} />
        </SectionAccordion>
        <SectionAccordion
          title="Congregations"
          editHref={editable ? `/trips/${trip.id}/edit?step=congregations` : undefined}
        >
          <CongregationsBody congregations={bundle.congregations} />
        </SectionAccordion>
      </Box>
    </>
  );
}
