import AttachFileIcon from "@mui/icons-material/AttachFile";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { EmptyNote, Field, FieldGrid } from "@/components/fields";
import {
  arrowRange,
  carTitle,
  congregationTitle,
  flightTitle,
  formatDateTime,
  formatShortDate,
  stayTitle,
} from "@/lib/format";
import type { CarRental, Congregation, Flight, Insurance, InsuranceDocument, Stay } from "@/lib/types";

function ItemBlock({
  index,
  title,
  subtext,
  children,
}: {
  index: number;
  title: string;
  subtext?: string;
  children?: React.ReactNode;
}) {
  return (
    <Box>
      {index > 0 ? <Divider sx={{ my: 1.25 }} /> : null}
      <Typography variant="subtitle2">{title}</Typography>
      {subtext ? (
        <Typography variant="body2" color="text.secondary">
          {subtext}
        </Typography>
      ) : null}
      {children ? <Box sx={{ mt: 1 }}>{children}</Box> : null}
    </Box>
  );
}

export function DocumentLink({ href, name }: { href: string; name: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0, mt: 1 }}>
      <AttachFileIcon fontSize="small" color="action" />
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        underline="hover"
        variant="body2"
        noWrap
        sx={{ minWidth: 0 }}
      >
        {name}
      </Link>
    </Box>
  );
}

export function FlightsBody({ flights }: { flights: Flight[] }) {
  if (flights.length === 0) return <EmptyNote>No flights yet.</EmptyNote>;
  return (
    <>
      {flights.map((flight, index) => (
        <ItemBlock key={flight.id} index={index} title={flightTitle(flight, index)}>
          <FieldGrid>
            <Field label="Flight #" value={flight.flightNumber} />
            <Field label="Route" value={arrowRange(flight.fromAirport.trim(), flight.toAirport.trim())} />
            <Field label="Depart" value={formatDateTime(flight.departAt)} />
            <Field label="Arrive" value={formatDateTime(flight.arriveAt)} />
            <Field label="Confirmation" value={flight.confirmation} />
            <Field label="Passengers" value={flight.passengers} />
            <Field label="Terminal / gate" value={flight.terminalGate} />
          </FieldGrid>
        </ItemBlock>
      ))}
    </>
  );
}

export function CarsBody({ cars }: { cars: CarRental[] }) {
  if (cars.length === 0) return <EmptyNote>No car rentals yet.</EmptyNote>;
  return (
    <>
      {cars.map((car, index) => (
        <ItemBlock key={car.id} index={index} title={carTitle(car, index)}>
          <FieldGrid>
            <Field label="Pickup time" value={formatDateTime(car.pickupAt)} />
            <Field label="Dropoff time" value={formatDateTime(car.dropoffAt)} />
            <Field label="Confirmation" value={car.confirmation} />
            <Field label="Vehicle" value={car.vehicleClass} />
            <Field label="Pickup" value={car.pickupPlace} full />
            <Field label="Dropoff" value={car.dropoffPlace} full />
            <Field label="Phone" value={car.contactPhone} />
          </FieldGrid>
        </ItemBlock>
      ))}
    </>
  );
}

export function StaysBody({ stays }: { stays: Stay[] }) {
  if (stays.length === 0) return <EmptyNote>No stays yet.</EmptyNote>;
  return (
    <>
      {stays.map((stay, index) => (
        <ItemBlock key={stay.id} index={index} title={stayTitle(stay, index)}>
          <FieldGrid>
            <Field label="Check-in" value={stay.checkIn ? formatShortDate(stay.checkIn) : ""} />
            <Field label="Check-out" value={stay.checkOut ? formatShortDate(stay.checkOut) : ""} />
            <Field label="Address" value={stay.address} full />
          </FieldGrid>
          {stay.documentName ? <DocumentLink href={`/api/documents/stay/${stay.id}`} name={stay.documentName} /> : null}
        </ItemBlock>
      ))}
    </>
  );
}

export function InsuranceBody({
  insurance,
  documents,
}: {
  insurance: Insurance;
  documents: InsuranceDocument[];
}) {
  const empty =
    !insurance.provider.trim() &&
    !insurance.policyNumber.trim() &&
    !insurance.phone.trim() &&
    !insurance.coverageStart &&
    !insurance.coverageEnd &&
    !insurance.claimNotes.trim() &&
    documents.length === 0;
  if (empty) return <EmptyNote>None</EmptyNote>;
  return (
    <>
      <FieldGrid>
        <Field label="Provider" value={insurance.provider} />
        <Field label="Policy number" value={insurance.policyNumber} />
        <Field label="Coverage start" value={insurance.coverageStart ? formatShortDate(insurance.coverageStart) : ""} />
        <Field label="Coverage end" value={insurance.coverageEnd ? formatShortDate(insurance.coverageEnd) : ""} />
        <Field label="Phone" value={insurance.phone} />
        <Field label="Claim notes" value={insurance.claimNotes} full />
      </FieldGrid>
      {documents.map((document) => (
        <DocumentLink key={document.id} href={`/api/documents/insurance/${document.id}`} name={document.documentName} />
      ))}
    </>
  );
}

export function CongregationsBody({ congregations }: { congregations: Congregation[] }) {
  if (congregations.length === 0) return <EmptyNote>No congregations yet.</EmptyNote>;
  return (
    <>
      {congregations.map((congregation, index) => (
        <ItemBlock key={congregation.id} index={index} title={congregationTitle(congregation, index)}>
          <FieldGrid>
            <Field label="Address" value={congregation.address} full />
            <Field label="Meeting times" value={congregation.meetingTimes} />
            <Field label="jw.org" value={congregation.jwOrgUrl} />
            <Field label="Notes" value={congregation.notes} full />
          </FieldGrid>
        </ItemBlock>
      ))}
    </>
  );
}

export function OverviewBody({
  destination,
  travelDate,
  returnDate,
  notes,
}: {
  destination: string;
  travelDate: string | null;
  returnDate: string | null;
  notes: string;
}) {
  return (
    <FieldGrid>
      <Field label="Where are we going?" value={destination} full />
      <Field label="Date of travel" value={travelDate ? formatShortDate(travelDate) : ""} />
      <Field label="Date of return" value={returnDate ? formatShortDate(returnDate) : ""} />
      <Field label="Notes" value={notes} full />
    </FieldGrid>
  );
}
