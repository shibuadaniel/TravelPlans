"use client";

import Box from "@mui/material/Box";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  CarsForm,
  FlightsForm,
  InsuranceForm,
  OverviewForm,
  StaysForm,
} from "@/components/editor-forms";
import { SectionAccordion } from "@/components/section-accordion";
import { CarsBody, FlightsBody, InsuranceBody, OverviewBody, StaysBody } from "@/components/section-bodies";
import { SharePanel } from "@/components/share-panel";
import { TitleChrome } from "@/components/title-chrome";
import { deleteTripAction } from "@/lib/actions/trips";
import { blankCar, blankFlight, blankStay } from "@/lib/blank";
import { travelReturnLabel } from "@/lib/format";
import {
  type CarRental,
  type Congregation,
  type EditStep,
  type Flight,
  type Insurance,
  type InsuranceDocument,
  type Member,
  type ShareLinkInfo,
  type Stay,
  type TripBundle,
} from "@/lib/types";

type SectionBaseline = {
  step: EditStep;
  destination: string;
  travelDate: string | null;
  returnDate: string | null;
  notes: string;
  flights: Flight[];
  cars: CarRental[];
  stays: Stay[];
  insurance: Insurance;
  documents: InsuranceDocument[];
  congregations: Congregation[];
};

export function TripEditor({
  bundle,
  initialStep,
  shareLinks,
  members,
  guestEmails,
  hideItinerary = false,
}: {
  bundle: TripBundle;
  initialStep: EditStep;
  shareLinks: ShareLinkInfo[];
  members: Member[];
  guestEmails: string[];
  hideItinerary?: boolean;
}) {
  const router = useRouter();
  const role = bundle.trip.role;
  const [overviewSaved, setOverviewSaved] = useState(bundle.trip.destination.trim().length > 0);
  const openingStep: EditStep | null = overviewSaved
    ? initialStep === "share" || initialStep === "congregations"
      ? null
      : initialStep
    : "overview";
  const [expanded, setExpanded] = useState<EditStep | false>(
    openingStep ?? (initialStep === "congregations" ? false : initialStep),
  );
  const [editing, setEditing] = useState<EditStep | null>(openingStep);
  const [destination, setDestination] = useState(bundle.trip.destination);
  const [travelDate, setTravelDate] = useState(bundle.trip.travelDate);
  const [returnDate, setReturnDate] = useState(bundle.trip.returnDate);
  const [notes, setNotes] = useState(bundle.trip.notes);
  const [flights, setFlights] = useState(bundle.flights);
  const [flightFocusId, setFlightFocusId] = useState<string | null>(null);
  const [cars, setCars] = useState(bundle.carRentals);
  const [stays, setStays] = useState(bundle.stays);
  const [insurance, setInsurance] = useState(bundle.insurance);
  const [documents, setDocuments] = useState(bundle.insuranceDocuments);
  const [congregations, setCongregations] = useState(bundle.congregations);
  const baselineRef = useRef<SectionBaseline | null>(null);

  function capture(step: EditStep): SectionBaseline {
    return {
      step,
      destination,
      travelDate,
      returnDate,
      notes,
      flights,
      cars,
      stays,
      insurance,
      documents,
      congregations,
    };
  }

  if (editing && baselineRef.current === null) {
    baselineRef.current = capture(editing);
  }

  function beginEdit(step: EditStep) {
    if (editing !== step) baselineRef.current = capture(step);
    setExpanded(step);
    setEditing(step);
  }

  async function leaveNewTrip() {
    await deleteTripAction(bundle.trip.id);
    router.push("/");
  }

  function cancelEdit() {
    const baseline = baselineRef.current;
    if (baseline?.step === "overview") {
      setDestination(baseline.destination);
      setTravelDate(baseline.travelDate);
      setReturnDate(baseline.returnDate);
      setNotes(baseline.notes);
    } else if (baseline?.step === "flights") {
      setFlights(baseline.flights);
    } else if (baseline?.step === "cars") {
      setCars(baseline.cars);
    } else if (baseline?.step === "stays") {
      setStays(baseline.stays);
    } else if (baseline?.step === "insurance") {
      setInsurance(baseline.insurance);
    } else if (baseline?.step === "congregations") {
      setCongregations(baseline.congregations);
    }
    setExpanded(baseline?.step ?? false);
    setEditing(null);
    setFlightFocusId(null);
  }

  function advance(from: EditStep) {
    baselineRef.current = null;
    setEditing(null);
    setFlightFocusId(null);
    setExpanded(from);
  }

  function shown(step: EditStep) {
    return editing === null || editing === step;
  }

  return (
    <>
      <TitleChrome
        backHref={overviewSaved ? `/trips/${bundle.trip.id}` : undefined}
        onBack={overviewSaved ? undefined : leaveNewTrip}
        backLabel={overviewSaved ? "Back to trip" : "Back"}
        title={destination}
        subtitle={travelReturnLabel(travelDate, returnDate)}
      />
      <Box sx={{ px: 1, pt: 1 }}>
        {shown("overview") ? (
        <SectionAccordion
          title="Overview"
          expanded={expanded === "overview"}
          locked={editing === "overview"}
          onChange={(open) => setExpanded(open ? "overview" : false)}
          onEdit={editing === "overview" ? undefined : () => beginEdit("overview")}
        >
          {editing === "overview" ? (
            <OverviewForm
              tripId={bundle.trip.id}
              destination={destination}
              travelDate={travelDate}
              returnDate={returnDate}
              notes={notes}
              onChange={(next) => {
                setDestination(next.destination);
                setTravelDate(next.travelDate);
                setReturnDate(next.returnDate);
                setNotes(next.notes);
              }}
              onSaved={() => {
                setOverviewSaved(true);
                advance("overview");
              }}
              onCancel={overviewSaved ? cancelEdit : leaveNewTrip}
            />
          ) : (
            <OverviewBody destination={destination} travelDate={travelDate} returnDate={returnDate} notes={notes} />
          )}
        </SectionAccordion>
        ) : null}

        {shown("flights") ? (
        <SectionAccordion
          title="Flights"
          count={flights.length}
          expanded={expanded === "flights"}
          locked={editing === "flights"}
          onChange={(open) => setExpanded(open ? "flights" : false)}
          onAdd={() => {
            const flight = blankFlight();
            beginEdit("flights");
            setFlightFocusId(flight.id);
            setFlights([...flights, flight]);
          }}
          onEdit={editing === "flights" ? undefined : () => beginEdit("flights")}
        >
          {editing === "flights" ? (
            <FlightsForm tripId={bundle.trip.id} flights={flights} setFlights={setFlights} focusId={flightFocusId} onSaved={() => advance("flights")} onCancel={cancelEdit} />
          ) : (
            <FlightsBody flights={flights} />
          )}
        </SectionAccordion>
        ) : null}

        {shown("cars") ? (
        <SectionAccordion
          title="Car rentals"
          count={cars.length}
          expanded={expanded === "cars"}
          locked={editing === "cars"}
          onChange={(open) => setExpanded(open ? "cars" : false)}
          onAdd={() => {
            beginEdit("cars");
            setCars([...cars, blankCar()]);
          }}
          onEdit={editing === "cars" ? undefined : () => beginEdit("cars")}
        >
          {editing === "cars" ? (
            <CarsForm tripId={bundle.trip.id} cars={cars} setCars={setCars} onSaved={() => advance("cars")} onCancel={cancelEdit} />
          ) : (
            <CarsBody cars={cars} />
          )}
        </SectionAccordion>
        ) : null}

        {shown("stays") ? (
        <SectionAccordion
          title="Stays"
          count={stays.length}
          expanded={expanded === "stays"}
          locked={editing === "stays"}
          onChange={(open) => setExpanded(open ? "stays" : false)}
          onAdd={() => {
            beginEdit("stays");
            setStays([...stays, blankStay()]);
          }}
          onEdit={editing === "stays" ? undefined : () => beginEdit("stays")}
        >
          {editing === "stays" ? (
            <StaysForm tripId={bundle.trip.id} stays={stays} setStays={setStays} onSaved={() => advance("stays")} onCancel={cancelEdit} />
          ) : (
            <StaysBody stays={stays} />
          )}
        </SectionAccordion>
        ) : null}

        {shown("insurance") ? (
        <SectionAccordion
          title="Insurance"
          expanded={expanded === "insurance"}
          locked={editing === "insurance"}
          onChange={(open) => setExpanded(open ? "insurance" : false)}
          onEdit={editing === "insurance" ? undefined : () => beginEdit("insurance")}
        >
          {editing === "insurance" ? (
            <InsuranceForm
              tripId={bundle.trip.id}
              insurance={insurance}
              setInsurance={setInsurance}
              documents={documents}
              setDocuments={setDocuments}
              onSaved={() => advance("insurance")}
              onCancel={cancelEdit}
            />
          ) : (
            <InsuranceBody insurance={insurance} documents={documents} />
          )}
        </SectionAccordion>
        ) : null}

        {role === "owner" && shown("share") ? (
          <SectionAccordion
            title="Share"
            expanded={expanded === "share"}
            onChange={(open) => setExpanded(open ? "share" : false)}
          >
            <SharePanel
              tripId={bundle.trip.id}
              links={shareLinks}
              members={members}
              guestEmails={guestEmails}
              hideItinerary={hideItinerary}
            />
          </SectionAccordion>
        ) : null}
      </Box>
    </>
  );
}
