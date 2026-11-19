"use client";

import IosShareIcon from "@mui/icons-material/IosShare";
import PrintIcon from "@mui/icons-material/Print";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import { useState } from "react";
import { SectionAccordion } from "@/components/section-accordion";
import { CarsBody, CongregationsBody, FlightsBody, InsuranceBody, StaysBody } from "@/components/section-bodies";
import { SharePanel } from "@/components/share-panel";
import { TitleChrome } from "@/components/title-chrome";
import { travelReturnLabel } from "@/lib/format";
import type { Member, ShareLinkInfo, TripBundle } from "@/lib/types";

export function TripBriefing({
  bundle,
  mode,
  shareLinks = [],
  members = [],
}: {
  bundle: TripBundle;
  mode: "owner" | "collaborator" | "guest";
  shareLinks?: ShareLinkInfo[];
  members?: Member[];
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const { trip } = bundle;
  const editable = mode !== "guest";

  return (
    <>
      <TitleChrome
        backHref={editable ? "/" : undefined}
        backLabel="Back"
        title={trip.destination}
        subtitle={travelReturnLabel(trip.travelDate, trip.returnDate)}
        actions={
          mode === "guest" ? null : (
            <>
              {mode === "owner" ? (
                <IconButton aria-label="Print" onClick={() => window.print()}>
                  <PrintIcon />
                </IconButton>
              ) : null}
              {mode === "owner" ? (
                <IconButton aria-label="Share trip" onClick={() => setShareOpen(true)}>
                  <IosShareIcon />
                </IconButton>
              ) : null}
            </>
          )
        }
      />
      <Box sx={{ px: 2, pt: 2 }}>
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
          <StaysBody stays={bundle.stays} />
        </SectionAccordion>
        <SectionAccordion title="Insurance" editHref={editable ? `/trips/${trip.id}/edit?step=insurance` : undefined}>
          <InsuranceBody insurance={bundle.insurance} documents={bundle.insuranceDocuments} />
        </SectionAccordion>
        <SectionAccordion
          title="Congregations"
          editHref={editable ? `/trips/${trip.id}/edit?step=congregations` : undefined}
        >
          <CongregationsBody congregations={bundle.congregations} />
        </SectionAccordion>
      </Box>
      {mode === "owner" ? (
        <Dialog open={shareOpen} onClose={() => setShareOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle>Share trip</DialogTitle>
          <DialogContent>
            {shareOpen ? <SharePanel tripId={trip.id} links={shareLinks} members={members} /> : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShareOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </>
  );
}
