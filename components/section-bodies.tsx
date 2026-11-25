import AttachFileIcon from "@mui/icons-material/AttachFile";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { DocumentAccess } from "@/components/document-access";
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
import type { CarRental, Congregation, Flight, FlightStatusChip, Insurance, InsuranceDocument, Stay } from "@/lib/types";

function ItemBlock({
  index,
  title,
  titleExtra,
  subtext,
  children,
}: {
  index: number;
  title: string;
  titleExtra?: React.ReactNode;
  subtext?: string;
  children?: React.ReactNode;
}) {
  return (
    <Box>
      {index > 0 ? <Divider sx={{ my: 1.25 }} /> : null}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" noWrap sx={{ minWidth: 0 }}>
          {title}
        </Typography>
        {titleExtra}
      </Box>
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

export function FlightsBody({
  flights,
  statuses,
}: {
  flights: Flight[];
  statuses?: Record<string, FlightStatusChip>;
}) {
  if (flights.length === 0) return <EmptyNote>No flights yet.</EmptyNote>;
  return (
    <>
      {flights.map((flight, index) => {
        const status = statuses?.[flight.id];
        return (
        <ItemBlock
          key={flight.id}
          index={index}
          title={flightTitle(flight, index)}
          titleExtra={
            status ? (
              <Chip label={status.label} color={status.color} size="small" sx={{ flexShrink: 0, height: 22 }} />
            ) : null
          }
        >
          <FieldGrid>
            <Field label="Flight #" value={flight.flightNumber} />
            <Field label="Route" value={arrowRange(flight.fromAirport.trim(), flight.toAirport.trim())} />
            <Field label="Depart" value={formatDateTime(flight.departAt)} nowrap />
            <Field label="Arrive" value={formatDateTime(flight.arriveAt)} nowrap />
            <Field label="Confirmation" value={flight.confirmation} />
            <Field label="Passengers" value={flight.passengers} />
            <Field label="Terminal / gate" value={flight.terminalGate} />
          </FieldGrid>
        </ItemBlock>
        );
      })}
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
            <Field label="Pickup time" value={formatDateTime(car.pickupAt)} nowrap />
            <Field label="Dropoff time" value={formatDateTime(car.dropoffAt)} nowrap />
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

export function StaysBody({ stays, guest = false }: { stays: Stay[]; guest?: boolean }) {
  if (stays.length === 0) return <EmptyNote>No stays yet.</EmptyNote>;
  return (
    <>
      {stays.map((stay, index) => (
        <ItemBlock key={stay.id} index={index} title={stayTitle(stay, index)}>
          <FieldGrid>
            <Field label="Check-in" value={stay.checkIn ? formatShortDate(stay.checkIn) : ""} nowrap />
            <Field label="Check-out" value={stay.checkOut ? formatShortDate(stay.checkOut) : ""} nowrap />
            <Field label="Address" value={stay.address} full />
          </FieldGrid>
          {stay.documentName ? (
            <DocumentAccess
              kind="stay"
              id={stay.id}
              name={stay.documentName}
              requiresApproval={stay.requiresApproval}
              guest={guest}
            />
          ) : null}
        </ItemBlock>
      ))}
    </>
  );
}

export function InsuranceBody({
  insurance,
  documents,
  guest = false,
}: {
  insurance: Insurance;
  documents: InsuranceDocument[];
  guest?: boolean;
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
        <Field label="Coverage start" value={insurance.coverageStart ? formatShortDate(insurance.coverageStart) : ""} nowrap />
        <Field label="Coverage end" value={insurance.coverageEnd ? formatShortDate(insurance.coverageEnd) : ""} nowrap />
        <Field label="Phone" value={insurance.phone} />
        <Field label="Claim notes" value={insurance.claimNotes} full />
      </FieldGrid>
      {documents.map((document) => (
        <DocumentAccess
          key={document.id}
          kind="insurance"
          id={document.id}
          name={document.documentName}
          requiresApproval={document.requiresApproval}
          guest={guest}
        />
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
      <Field label="Date of travel" value={travelDate ? formatShortDate(travelDate) : ""} nowrap />
      <Field label="Date of return" value={returnDate ? formatShortDate(returnDate) : ""} nowrap />
      <Field label="Notes" value={notes} full />
    </FieldGrid>
  );
}
