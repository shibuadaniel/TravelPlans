"use client";

import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteIcon from "@mui/icons-material/Delete";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormGrid } from "@/components/fields";
import { DocumentLink } from "@/components/section-bodies";
import {
  deleteInsuranceDocumentAction,
  saveCarsAction,
  saveCongregationsAction,
  saveFlightsAction,
  saveInsuranceAction,
  saveOverviewAction,
  saveStaysAction,
} from "@/lib/actions/trips";
import { searchCongregations } from "@/lib/actions/search";
import { blankCongregation } from "@/lib/blank";
import { ARRIVAL_BEFORE_DEPARTURE, arrivalBeforeDeparture } from "@/lib/flight-time";
import {
  carTitle,
  congregationTitle,
  endsBeforeStart,
  flightTitle,
  stayTitle,
} from "@/lib/format";
import type {
  CarRental,
  Congregation,
  CongregationSuggestion,
  Flight,
  Insurance,
  InsuranceDocument,
  Stay,
} from "@/lib/types";

function FormActions({
  pending,
  onCancel,
  saveDisabled = false,
}: {
  pending: boolean;
  onCancel?: () => void;
  saveDisabled?: boolean;
}) {
  return (
    <Stack direction="row" spacing={1}>
      {onCancel ? (
        <Button type="button" variant="outlined" fullWidth disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
      ) : null}
      <Button type="submit" variant="contained" fullWidth disabled={pending || saveDisabled}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </Stack>
  );
}

function useActiveIndex(count: number, initialIndex = 0) {
  const [index, setIndex] = useState(() => Math.min(Math.max(initialIndex, 0), Math.max(0, count - 1)));
  const previous = useRef(count);
  const last = Math.max(0, count - 1);
  if (count > previous.current) {
    previous.current = count;
    if (index !== last) setIndex(last);
  } else if (index > last) {
    previous.current = count;
    setIndex(last);
  } else if (previous.current !== count) {
    previous.current = count;
  }
  return [count === 0 ? 0 : Math.min(index, last), setIndex] as const;
}

function ItemChips({
  labels,
  active,
  onChange,
  onDelete,
}: {
  labels: string[];
  active: number;
  onChange: (index: number) => void;
  onDelete: () => void;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, flex: 1, minWidth: 0 }}>
        {labels.map((label, index) => (
          <Chip
            key={label}
            label={label}
            size="small"
            color={index === active ? "primary" : "default"}
            variant={index === active ? "filled" : "outlined"}
            aria-pressed={index === active}
            sx={{ "& .MuiChip-label": { px: 2 } }}
            onClick={() => onChange(index)}
          />
        ))}
      </Box>
      <IconButton aria-label={`Delete ${labels[active]}`} onClick={onDelete} sx={{ mt: -0.5 }}>
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

function EditItemHeader({ title, onDelete }: { title: string; onDelete: () => void }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography variant="subtitle2" sx={{ flex: 1, minWidth: 0 }} noWrap>
        {title}
      </Typography>
      <IconButton aria-label={`Delete ${title}`} onClick={onDelete}>
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

const dateSlot = { inputLabel: { shrink: true } };
const wide = { gridColumn: "1 / -1" };

export function OverviewForm({
  tripId,
  destination,
  travelDate,
  returnDate,
  notes,
  onChange,
  onSaved,
  onCancel,
}: {
  tripId: string;
  destination: string;
  travelDate: string | null;
  returnDate: string | null;
  notes: string;
  onChange: (next: { destination: string; travelDate: string | null; returnDate: string | null; notes: string }) => void;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overlap, setOverlap] = useState<string | null>(null);
  const destinationMissing = destination.trim().length === 0;

  async function save(acknowledgeOverlap = false) {
    if (destinationMissing) return;
    if (endsBeforeStart(travelDate, returnDate)) {
      setError("The return date must be on or after the travel date.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await saveOverviewAction(tripId, { destination, travelDate, returnDate, notes }, { acknowledgeOverlap });
    setPending(false);
    if (!result.ok) {
      if (result.overlap) {
        setOverlap(result.error);
        return;
      }
      setError(result.error);
      return;
    }
    onChange(result.data);
    onSaved();
  }

  return (
    <Stack component="form" spacing={1.5} autoComplete="off" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <FormGrid>
        <TextField
          fullWidth
          sx={wide}
          label="Where are we going?"
          required
          value={destination}
          onChange={(event) => onChange({ destination: event.target.value, travelDate, returnDate, notes })}
        />
        <TextField
          fullWidth
          label="Date of travel"
          type="date"
          value={travelDate ?? ""}
          slotProps={{ ...dateSlot, htmlInput: { max: returnDate || undefined } }}
          onChange={(event) => onChange({ destination, travelDate: event.target.value || null, returnDate, notes })}
        />
        <TextField
          fullWidth
          label="Date of return"
          type="date"
          value={returnDate ?? ""}
          slotProps={{ ...dateSlot, htmlInput: { min: travelDate || undefined } }}
          onChange={(event) => onChange({ destination, travelDate, returnDate: event.target.value || null, notes })}
        />
        <TextField
          fullWidth
          sx={wide}
          label="Notes"
          multiline
          minRows={3}
          value={notes}
          onChange={(event) => onChange({ destination, travelDate, returnDate, notes: event.target.value })}
        />
      </FormGrid>
      <FormActions pending={pending} onCancel={onCancel} saveDisabled={destinationMissing} />
      <ConfirmDialog
        open={Boolean(overlap)}
        title="Dates overlap"
        body={`${overlap ?? ""} Save this trip anyway?`}
        confirmLabel="Save anyway"
        pending={pending}
        onClose={() => setOverlap(null)}
        onConfirm={() => void save(true)}
      />
    </Stack>
  );
}

export function FlightsForm({
  tripId,
  flights,
  setFlights,
  onSaved,
  onCancel,
  focusId = null,
}: {
  tripId: string;
  flights: Flight[];
  setFlights: (flights: Flight[]) => void;
  onSaved: () => void;
  onCancel: () => void;
  focusId?: string | null;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialIndex = focusId ? flights.findIndex((item) => item.id === focusId) : 0;
  const [active, setActive] = useActiveIndex(flights.length, initialIndex);
  const flight = flights[active];

  function update(id: string, patch: Partial<Flight>) {
    setFlights(flights.map((flight) => (flight.id === id ? { ...flight, ...patch } : flight)));
  }

  async function save() {
    if (flights.some((item) => arrivalBeforeDeparture(item))) {
      setError(ARRIVAL_BEFORE_DEPARTURE);
      return;
    }
    setPending(true);
    setError(null);
    const result = await saveFlightsAction(tripId, flights);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFlights(result.data);
    onSaved();
  }

  return (
    <Stack component="form" spacing={1.5} autoComplete="off" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {flights.length === 0 ? <Typography variant="body2" color="text.secondary">No flights yet.</Typography> : null}
      {flights.length > 1 ? (
        <ItemChips
          labels={flights.map((_, index) => `Flight ${index + 1}`)}
          active={active}
          onChange={setActive}
          onDelete={() => setFlights(flights.filter((_, index) => index !== active))}
        />
      ) : flight ? (
        <EditItemHeader title={flightTitle(flight, active)} onDelete={() => setFlights(flights.filter((item) => item.id !== flight.id))} />
      ) : null}
      {flight ? (
        <FormGrid>
          <TextField fullWidth label="Airline" value={flight.airline} onChange={(event) => update(flight.id, { airline: event.target.value })} />
          <TextField fullWidth label="Flight #" value={flight.flightNumber} onChange={(event) => update(flight.id, { flightNumber: event.target.value })} />
          <TextField fullWidth label="From" value={flight.fromAirport} onChange={(event) => update(flight.id, { fromAirport: event.target.value })} />
          <TextField fullWidth label="To" value={flight.toAirport} onChange={(event) => update(flight.id, { toAirport: event.target.value })} />
          <TextField fullWidth sx={{ ...wide, "& .MuiInputBase-input": { minWidth: 0 } }} label="Depart (local)" type="datetime-local" value={flight.departAt ?? ""} slotProps={dateSlot} onChange={(event) => update(flight.id, { departAt: event.target.value || null })} />
          <TextField fullWidth sx={{ ...wide, "& .MuiInputBase-input": { minWidth: 0 } }} label="Arrive (local)" type="datetime-local" value={flight.arriveAt ?? ""} slotProps={dateSlot} onChange={(event) => update(flight.id, { arriveAt: event.target.value || null })} />
          <TextField fullWidth label="Confirmation" value={flight.confirmation} onChange={(event) => update(flight.id, { confirmation: event.target.value })} />
          <TextField fullWidth label="Passengers" value={flight.passengers} onChange={(event) => update(flight.id, { passengers: event.target.value })} />
          <TextField fullWidth label="Terminal / gate" value={flight.terminalGate} onChange={(event) => update(flight.id, { terminalGate: event.target.value })} />
        </FormGrid>
      ) : null}
      <FormActions pending={pending} onCancel={onCancel} />
    </Stack>
  );
}

export function CarsForm({
  tripId,
  cars,
  setCars,
  onSaved,
  onCancel,
}: {
  tripId: string;
  cars: CarRental[];
  setCars: (cars: CarRental[]) => void;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useActiveIndex(cars.length);
  const car = cars[active];

  function update(id: string, patch: Partial<CarRental>) {
    setCars(cars.map((car) => (car.id === id ? { ...car, ...patch } : car)));
  }

  async function save() {
    if (cars.some((item) => endsBeforeStart(item.pickupAt, item.dropoffAt))) {
      setError("Dropoff must be at or after pickup.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await saveCarsAction(tripId, cars);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCars(result.data);
    onSaved();
  }

  return (
    <Stack component="form" spacing={1.5} autoComplete="off" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {cars.length === 0 ? <Typography variant="body2" color="text.secondary">No car rentals yet.</Typography> : null}
      {cars.length > 1 ? (
        <ItemChips
          labels={cars.map((_, index) => `Car ${index + 1}`)}
          active={active}
          onChange={setActive}
          onDelete={() => setCars(cars.filter((_, index) => index !== active))}
        />
      ) : car ? (
        <EditItemHeader title={carTitle(car, active)} onDelete={() => setCars(cars.filter((item) => item.id !== car.id))} />
      ) : null}
      {car ? (
        <FormGrid>
          <TextField fullWidth label="Company" value={car.company} onChange={(event) => update(car.id, { company: event.target.value })} />
          <TextField fullWidth label="Confirmation" value={car.confirmation} onChange={(event) => update(car.id, { confirmation: event.target.value })} />
          <TextField fullWidth sx={wide} label="Pickup place" value={car.pickupPlace} onChange={(event) => update(car.id, { pickupPlace: event.target.value })} />
          <TextField fullWidth sx={wide} label="Dropoff place" value={car.dropoffPlace} onChange={(event) => update(car.id, { dropoffPlace: event.target.value })} />
          <TextField fullWidth label="Pickup time" type="datetime-local" value={car.pickupAt ?? ""} slotProps={{ ...dateSlot, htmlInput: { max: car.dropoffAt || undefined } }} onChange={(event) => update(car.id, { pickupAt: event.target.value || null })} />
          <TextField fullWidth label="Dropoff time" type="datetime-local" value={car.dropoffAt ?? ""} slotProps={{ ...dateSlot, htmlInput: { min: car.pickupAt || undefined } }} onChange={(event) => update(car.id, { dropoffAt: event.target.value || null })} />
          <TextField fullWidth label="Vehicle class" value={car.vehicleClass} onChange={(event) => update(car.id, { vehicleClass: event.target.value })} />
          <TextField fullWidth label="Contact phone" value={car.contactPhone} onChange={(event) => update(car.id, { contactPhone: event.target.value })} />
        </FormGrid>
      ) : null}
      <FormActions pending={pending} onCancel={onCancel} />
    </Stack>
  );
}

export function StaysForm({
  tripId,
  stays,
  setStays,
  onSaved,
  onCancel,
}: {
  tripId: string;
  stays: Stay[];
  setStays: (stays: Stay[]) => void;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const files = useRef<Record<string, File | undefined>>({});
  const clears = useRef<Set<string>>(new Set());
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [clearedTick, setClearedTick] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useActiveIndex(stays.length);
  const stay = stays[active];

  function update(id: string, patch: Partial<Stay>) {
    setStays(stays.map((stay) => (stay.id === id ? { ...stay, ...patch } : stay)));
  }

  async function save() {
    if (stays.some((item) => endsBeforeStart(item.checkIn, item.checkOut))) {
      setError("Check-out must be on or after check-in.");
      return;
    }
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set(
      "payload",
      JSON.stringify(
        stays.map((stay) => ({
          ...stay,
          clearDocument: clears.current.has(stay.id),
        })),
      ),
    );
    for (const stay of stays) {
      const file = files.current[stay.id];
      if (file) formData.set(`file_${stay.id}`, file);
    }
    const result = await saveStaysAction(tripId, formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    files.current = {};
    clears.current = new Set();
    setPicked({});
    setStays(result.data);
    onSaved();
  }

  const pickedName = stay ? picked[stay.id] : "";
  const stayCleared = stay ? clears.current.has(stay.id) : false;
  const existingName = stay && !stayCleared && !pickedName ? stay.documentName : null;
  void clearedTick;

  return (
    <Stack component="form" spacing={1.5} autoComplete="off" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {stays.length === 0 ? <Typography variant="body2" color="text.secondary">No stays yet.</Typography> : null}
      {stays.length > 1 ? (
        <ItemChips
          labels={stays.map((_, index) => `Stay ${index + 1}`)}
          active={active}
          onChange={setActive}
          onDelete={() => setStays(stays.filter((_, index) => index !== active))}
        />
      ) : stay ? (
        <EditItemHeader title={stayTitle(stay, active)} onDelete={() => setStays(stays.filter((item) => item.id !== stay.id))} />
      ) : null}
      {stay ? (
        <FormGrid>
          <TextField fullWidth sx={wide} label="Place" value={stay.name} onChange={(event) => update(stay.id, { name: event.target.value })} />
          <TextField fullWidth sx={wide} label="Address" value={stay.address} onChange={(event) => update(stay.id, { address: event.target.value })} />
          <TextField fullWidth label="Check-in" type="date" value={stay.checkIn ?? ""} slotProps={{ ...dateSlot, htmlInput: { max: stay.checkOut || undefined } }} onChange={(event) => update(stay.id, { checkIn: event.target.value || null })} />
          <TextField fullWidth label="Check-out" type="date" value={stay.checkOut ?? ""} slotProps={{ ...dateSlot, htmlInput: { min: stay.checkIn || undefined } }} onChange={(event) => update(stay.id, { checkOut: event.target.value || null })} />
          <Box sx={wide}>
          {pickedName ? (
            <Typography variant="body2">{pickedName}</Typography>
          ) : existingName ? (
            <DocumentLink href={`/api/documents/stay/${stay.id}`} name={existingName} />
          ) : (
            <Typography variant="body2" color="text.secondary">No document uploaded.</Typography>
          )}
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button component="label" variant="outlined" startIcon={<AttachFileIcon />}>
              Upload
              <input
                hidden
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  files.current[stay.id] = file;
                  clears.current.delete(stay.id);
                  setPicked((current) => ({ ...current, [stay.id]: file.name }));
                }}
              />
            </Button>
            {pickedName || existingName ? (
              <Button
                color="error"
                onClick={() => {
                  delete files.current[stay.id];
                  clears.current.add(stay.id);
                  update(stay.id, { requiresApproval: false });
                  setPicked((current) => ({ ...current, [stay.id]: "" }));
                  setClearedTick((value) => value + 1);
                }}
              >
                Remove
              </Button>
            ) : null}
          </Stack>
          {pickedName || existingName ? (
            <FormControlLabel
              sx={{ mt: 1, ml: 0, alignItems: "flex-start" }}
              control={
                <Checkbox
                  size="small"
                  checked={stay.requiresApproval}
                  onChange={(event) => update(stay.id, { requiresApproval: event.target.checked })}
                  sx={{ pt: 0.25 }}
                />
              }
              label="Ask me before a guest opens this"
            />
          ) : null}
          </Box>
        </FormGrid>
      ) : null}
      <FormActions pending={pending} onCancel={onCancel} />
    </Stack>
  );
}

export function InsuranceForm({
  tripId,
  insurance,
  setInsurance,
  documents,
  setDocuments,
  onSaved,
  onCancel,
}: {
  tripId: string;
  insurance: Insurance;
  setInsurance: (insurance: Insurance) => void;
  documents: InsuranceDocument[];
  setDocuments: (documents: InsuranceDocument[]) => void;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<{ name: string; requiresApproval: boolean }[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (endsBeforeStart(insurance.coverageStart, insurance.coverageEnd)) {
      setError("Coverage end must be on or after coverage start.");
      return;
    }
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("payload", JSON.stringify(insurance));
    formData.set(
      "documents",
      JSON.stringify(documents.map((document) => ({ id: document.id, requiresApproval: document.requiresApproval }))),
    );
    const files = fileRef.current?.files;
    if (files) {
      for (const [index, file] of Array.from(files).entries()) {
        formData.append("files", file);
        formData.append("approvals", picked[index]?.requiresApproval ? "1" : "0");
      }
    }
    const result = await saveInsuranceAction(tripId, formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setInsurance(result.data.insurance);
    setDocuments(result.data.documents);
    setPicked([]);
    if (fileRef.current) fileRef.current.value = "";
    onSaved();
  }

  async function removeDocument(documentId: string) {
    setPending(true);
    setError(null);
    const result = await deleteInsuranceDocumentAction(tripId, documentId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDocuments(result.data);
  }

  return (
    <Stack component="form" spacing={1.5} autoComplete="off" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <FormGrid>
        <TextField fullWidth label="Provider" value={insurance.provider} onChange={(event) => setInsurance({ ...insurance, provider: event.target.value })} />
        <TextField fullWidth label="Policy number" value={insurance.policyNumber} onChange={(event) => setInsurance({ ...insurance, policyNumber: event.target.value })} />
        <TextField fullWidth label="Coverage start" type="date" value={insurance.coverageStart ?? ""} slotProps={{ ...dateSlot, htmlInput: { max: insurance.coverageEnd || undefined } }} onChange={(event) => setInsurance({ ...insurance, coverageStart: event.target.value || null })} />
        <TextField fullWidth label="Coverage end" type="date" value={insurance.coverageEnd ?? ""} slotProps={{ ...dateSlot, htmlInput: { min: insurance.coverageStart || undefined } }} onChange={(event) => setInsurance({ ...insurance, coverageEnd: event.target.value || null })} />
        <TextField fullWidth label="Phone" value={insurance.phone} onChange={(event) => setInsurance({ ...insurance, phone: event.target.value })} />
        <TextField fullWidth sx={wide} label="Claim notes" multiline minRows={3} value={insurance.claimNotes} onChange={(event) => setInsurance({ ...insurance, claimNotes: event.target.value })} />
      </FormGrid>
      <Typography variant="subtitle2">Policy documents</Typography>
      {documents.length === 0 && picked.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No document uploaded.</Typography>
      ) : null}
      {documents.map((document) => (
        <Box key={document.id} sx={{ display: "flex", alignItems: "flex-start", gap: 1, minWidth: 0 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <DocumentLink href={`/api/documents/insurance/${document.id}`} name={document.documentName} />
            <FormControlLabel
              sx={{ ml: 0, alignItems: "flex-start" }}
              control={
                <Checkbox
                  size="small"
                  checked={document.requiresApproval}
                  onChange={(event) =>
                    setDocuments(
                      documents.map((item) =>
                        item.id === document.id ? { ...item, requiresApproval: event.target.checked } : item,
                      ),
                    )
                  }
                  sx={{ pt: 0.25 }}
                />
              }
              label="Ask me before a guest opens this"
            />
          </Box>
          <IconButton aria-label={`Delete ${document.documentName}`} disabled={pending} onClick={() => void removeDocument(document.id)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
      {picked.map((file, index) => (
        <Box key={`${file.name}-${index}`}>
          <Typography variant="body2">{file.name}</Typography>
          <FormControlLabel
            sx={{ ml: 0, alignItems: "flex-start" }}
            control={
              <Checkbox
                size="small"
                checked={file.requiresApproval}
                onChange={(event) =>
                  setPicked((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, requiresApproval: event.target.checked } : item,
                    ),
                  )
                }
                sx={{ pt: 0.25 }}
              />
            }
            label="Ask me before a guest opens this"
          />
        </Box>
      ))}
      <Button component="label" variant="outlined" startIcon={<AttachFileIcon />}>
        Upload
        <input
          ref={fileRef}
          hidden
          multiple
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif"
          onChange={(event) =>
            setPicked(Array.from(event.target.files ?? []).map((file) => ({ name: file.name, requiresApproval: false })))
          }
        />
      </Button>
      <FormActions pending={pending} onCancel={onCancel} />
    </Stack>
  );
}

export function CongregationsForm({
  tripId,
  congregations,
  setCongregations,
  initialQuery,
  onSaved,
  onCancel,
}: {
  tripId: string;
  congregations: Congregation[];
  setCongregations: (congregations: Congregation[]) => void;
  initialQuery: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<CongregationSuggestion[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useActiveIndex(congregations.length);
  const congregation = congregations[active];

  function update(id: string, patch: Partial<Congregation>) {
    setCongregations(congregations.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function search() {
    setSearching(true);
    setSearchError(null);
    const result = await searchCongregations(query);
    setSearching(false);
    if (!result.ok) {
      setSuggestions([]);
      setSearchError(result.error);
      return;
    }
    setSuggestions(result.data);
    if (result.data.length === 0) setSearchError("No congregations found nearby. Add one manually.");
  }

  function attach(suggestion: CongregationSuggestion) {
    setCongregations([
      ...congregations,
      { ...blankCongregation(), name: suggestion.name, address: suggestion.address, jwOrgUrl: suggestion.jwOrgUrl },
    ]);
  }

  async function save() {
    setPending(true);
    setError(null);
    const result = await saveCongregationsAction(tripId, congregations);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCongregations(result.data);
    onSaved();
  }

  return (
    <Stack component="form" spacing={1.5} autoComplete="off" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <TextField label="City / region" value={query} onChange={(event) => setQuery(event.target.value)} />
      <Button variant="outlined" disabled={searching} onClick={() => void search()}>
        {searching ? "Searching…" : "Find nearby"}
      </Button>
      {searchError ? <Typography variant="body2" color="text.secondary">{searchError}</Typography> : null}
      {suggestions.map((suggestion) => (
        <Box key={suggestion.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap>{suggestion.name}</Typography>
            {suggestion.address ? (
              <Typography variant="body2" color="text.secondary">{suggestion.address}</Typography>
            ) : null}
            {suggestion.jwOrgUrl ? (
              <Typography variant="caption" component="a" href={suggestion.jwOrgUrl} target="_blank" rel="noopener noreferrer">
                jw.org
              </Typography>
            ) : null}
          </Box>
          <Button onClick={() => attach(suggestion)}>Attach</Button>
        </Box>
      ))}
      {congregations.length === 0 ? <Typography variant="body2" color="text.secondary">No congregations yet.</Typography> : null}
      {congregations.length > 1 ? (
        <ItemChips
          labels={congregations.map((_, index) => `Congregation ${index + 1}`)}
          active={active}
          onChange={setActive}
          onDelete={() => setCongregations(congregations.filter((_, index) => index !== active))}
        />
      ) : congregation ? (
        <EditItemHeader
          title={congregationTitle(congregation, active)}
          onDelete={() => setCongregations(congregations.filter((item) => item.id !== congregation.id))}
        />
      ) : null}
      {congregation ? (
        <FormGrid>
          <TextField fullWidth sx={wide} label="Name" value={congregation.name} onChange={(event) => update(congregation.id, { name: event.target.value })} />
          <TextField fullWidth sx={wide} label="Address" value={congregation.address} onChange={(event) => update(congregation.id, { address: event.target.value })} />
          <TextField fullWidth sx={wide} label="Meeting times" value={congregation.meetingTimes} onChange={(event) => update(congregation.id, { meetingTimes: event.target.value })} />
          <TextField fullWidth sx={wide} label="jw.org link" placeholder="https://www.jw.org/…" value={congregation.jwOrgUrl} onChange={(event) => update(congregation.id, { jwOrgUrl: event.target.value })} />
          <TextField fullWidth sx={wide} label="Notes" multiline minRows={2} value={congregation.notes} onChange={(event) => update(congregation.id, { notes: event.target.value })} />
        </FormGrid>
      ) : null}
      <FormActions pending={pending} onCancel={onCancel} />
    </Stack>
  );
}
