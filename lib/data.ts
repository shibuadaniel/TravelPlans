import "server-only";

import { createHash, randomBytes, randomUUID } from "crypto";
import { dbAll, dbGet, dbRun, transaction } from "@/lib/db";
import { removeStoredFile } from "@/lib/uploads";
import { cleanJwUrl } from "@/lib/urls";
import type {
  CarRental,
  Congregation,
  Flight,
  Insurance,
  InsuranceDocument,
  Member,
  Role,
  TripRole,
  ShareLinkInfo,
  Stay,
  Trip,
  TripBundle,
  TripListItem,
  User,
} from "@/lib/types";

type UserRow = {
  id: string;
  email: string;
  name: string;
  onboarded_at: string | null;
  created_at: string;
};

type TripRow = {
  id: string;
  destination: string;
  travel_date: string | null;
  return_date: string | null;
  notes: string;
};

function now() {
  return new Date().toISOString();
}

function text(value: string | null | undefined, max: number) {
  return (value ?? "").trim().slice(0, max);
}

function dateOnly(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function dateTime(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed) ? trimmed.slice(0, 16) : null;
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    onboardedAt: row.onboarded_at,
  };
}

let pinColumnsReady: Promise<void> | null = null;

function isLockTimeout(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "55P03";
}

function ensureSharePinColumns() {
  pinColumnsReady ??= (async () => {
    try {
      await transaction(async () => {
        await dbRun("SET LOCAL lock_timeout = '3s'");
        await dbRun("ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash text");
        await dbRun("ALTER TABLE users ADD COLUMN IF NOT EXISTS share_gate integer NOT NULL DEFAULT 0");
        await dbRun("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_key text");
        await dbRun("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_mime text");
      });
    } catch (error) {
      pinColumnsReady = null;
      if (!isLockTimeout(error)) throw error;
    }
  })().catch((error) => {
    pinColumnsReady = null;
    throw error;
  });
  return pinColumnsReady;
}

export async function userHasSharePin(userId: string) {
  await ensureSharePinColumns();
  const row = await dbGet<{ pin_hash: string | null }>("SELECT pin_hash FROM users WHERE id = ?", userId);
  return Boolean(row?.pin_hash);
}

export async function saveSharePin(userId: string, pinHash: string) {
  await ensureSharePinColumns();
  await dbRun("UPDATE users SET pin_hash = ?, share_gate = share_gate + 1 WHERE id = ?", pinHash, userId);
}

export async function tripSharePin(tripId: string) {
  await ensureSharePinColumns();
  const row = await dbGet<{ pin_hash: string | null; share_gate: number | string }>(
    `SELECT u.pin_hash, u.share_gate
     FROM trips t JOIN users u ON u.id = t.owner_user_id
     WHERE t.id = ?`,
    tripId,
  );
  if (!row?.pin_hash) return null;
  return { pinHash: row.pin_hash, gate: Number(row.share_gate) };
}

export async function userAvatar(userId: string) {
  if (!userId) return null;
  await ensureSharePinColumns();
  const row = await dbGet<{ avatar_key: string | null; avatar_mime: string | null }>(
    "SELECT avatar_key, avatar_mime FROM users WHERE id = ?",
    userId,
  );
  if (!row?.avatar_key || !row.avatar_mime) return null;
  return { key: row.avatar_key, mime: row.avatar_mime };
}

export async function tripOwnerAvatar(tripId: string) {
  await ensureSharePinColumns();
  const row = await dbGet<{ avatar_key: string | null; avatar_mime: string | null }>(
    `SELECT u.avatar_key, u.avatar_mime
     FROM trips t JOIN users u ON u.id = t.owner_user_id
     WHERE t.id = ?`,
    tripId,
  );
  if (!row?.avatar_key || !row.avatar_mime) return null;
  return { key: row.avatar_key, mime: row.avatar_mime };
}

export async function replaceUserAvatar(userId: string, key: string, mime: string) {
  await ensureSharePinColumns();
  const previous = await userAvatar(userId);
  await dbRun("UPDATE users SET avatar_key = ?, avatar_mime = ? WHERE id = ?", key, mime, userId);
  return previous?.key ?? null;
}

export async function clearUserAvatar(userId: string) {
  await ensureSharePinColumns();
  const previous = await userAvatar(userId);
  await dbRun("UPDATE users SET avatar_key = NULL, avatar_mime = NULL WHERE id = ?", userId);
  return previous?.key ?? null;
}

export async function findUserById(id: string) {
  const row = await dbGet<UserRow>(
    "SELECT id, email, name, onboarded_at, created_at FROM users WHERE id = ?",
    id,
  );
  return row ? mapUser(row) : null;
}

export async function findUserByEmail(email: string) {
  const row = await dbGet<UserRow>(
    "SELECT id, email, name, onboarded_at, created_at FROM users WHERE email = ?",
    email.trim().toLowerCase(),
  );
  return row ? mapUser(row) : null;
}

export async function insertUser(id: string, email: string) {
  await dbRun(
    "INSERT INTO users (id, email, name, onboarded_at, created_at) VALUES (?, ?, '', NULL, ?)",
    id,
    email.trim().toLowerCase(),
    now(),
  );
  return id;
}

export async function completeOnboarding(userId: string, name: string, email: string) {
  const stamp = now();
  await dbRun(
    `INSERT INTO users (id, email, name, onboarded_at, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET name = excluded.name, onboarded_at = excluded.onboarded_at`,
    userId,
    email.trim().toLowerCase(),
    text(name, 80),
    stamp,
    stamp,
  );
}

export async function getRole(userId: string, tripId: string) {
  const row = await dbGet<{ role: Role }>(
    "SELECT role FROM trip_members WHERE user_id = ? AND trip_id = ?",
    userId,
    tripId,
  );
  return row?.role ?? null;
}

export async function listTripsForUser(userId: string): Promise<TripListItem[]> {
  const rows = (await dbAll<{
    id: string;
    destination: string;
    travel_date: string | null;
    return_date: string | null;
    role: Role;
  }>(
    `SELECT t.id, t.destination, t.travel_date, t.return_date, m.role
     FROM trips t
     JOIN trip_members m ON m.trip_id = t.id
     WHERE m.user_id = ?
     ORDER BY t.updated_at DESC`,
    userId,
  ));
  return rows.map((row) => ({
    id: row.id,
    destination: row.destination,
    travelDate: row.travel_date,
    returnDate: row.return_date,
    role: row.role,
    photo: null,
  }));
}

export async function insertBlankTrip(userId: string) {
  const id = randomUUID();
  const timestamp = now();
  await transaction(async () => {
    await dbRun(
      `INSERT INTO trips (id, owner_user_id, destination, travel_date, return_date, notes, created_at, updated_at)
       VALUES (?, ?, '', NULL, NULL, '', ?, ?)`,
      id,
      userId,
      timestamp,
      timestamp,
    );
    await dbRun(
      "INSERT INTO trip_members (trip_id, user_id, role, created_at) VALUES (?, ?, 'owner', ?)",
      id,
      userId,
      timestamp,
    );
    await dbRun(
      `INSERT INTO insurance (trip_id, provider, policy_number, phone, coverage_start, coverage_end, claim_notes, updated_at)
       VALUES (?, '', '', '', NULL, NULL, '', ?)`,
      id,
      timestamp,
    );
  });
  return id;
}

async function touchTrip(tripId: string) {
  await dbRun("UPDATE trips SET updated_at = ? WHERE id = ?", now(), tripId);
}

function mapFlight(row: {
  id: string;
  airline: string;
  flight_number: string;
  from_airport: string;
  to_airport: string;
  depart_at: string | null;
  arrive_at: string | null;
  confirmation: string;
  passengers: string;
  terminal_gate: string;
}): Flight {
  return {
    id: row.id,
    airline: row.airline,
    flightNumber: row.flight_number,
    fromAirport: row.from_airport,
    toAirport: row.to_airport,
    departAt: row.depart_at,
    arriveAt: row.arrive_at,
    confirmation: row.confirmation,
    passengers: row.passengers,
    terminalGate: row.terminal_gate,
  };
}

function mapCar(row: {
  id: string;
  company: string;
  confirmation: string;
  pickup_place: string;
  dropoff_place: string;
  pickup_at: string | null;
  dropoff_at: string | null;
  vehicle_class: string;
  contact_phone: string;
}): CarRental {
  return {
    id: row.id,
    company: row.company,
    confirmation: row.confirmation,
    pickupPlace: row.pickup_place,
    dropoffPlace: row.dropoff_place,
    pickupAt: row.pickup_at,
    dropoffAt: row.dropoff_at,
    vehicleClass: row.vehicle_class,
    contactPhone: row.contact_phone,
  };
}

function mapStay(row: {
  id: string;
  name: string;
  address: string;
  check_in: string | null;
  check_out: string | null;
  document_name: string | null;
  document_mime: string | null;
  document_size: number | null;
}): Stay {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    checkIn: row.check_in,
    checkOut: row.check_out,
    documentName: row.document_name,
    documentMime: row.document_mime,
    documentSize: row.document_size,
  };
}

function mapCongregation(row: {
  id: string;
  name: string;
  address: string;
  meeting_times: string;
  jw_org_url: string;
  notes: string;
}): Congregation {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    meetingTimes: row.meeting_times,
    jwOrgUrl: row.jw_org_url,
    notes: row.notes,
  };
}

const emptyInsurance: Insurance = {
  provider: "",
  policyNumber: "",
  phone: "",
  coverageStart: null,
  coverageEnd: null,
  claimNotes: "",
};

export async function getBundle(tripId: string, role: TripRole): Promise<TripBundle | null> {
  const guest = role === "guest";
  const trip = await dbGet<TripRow>(
    guest
      ? "SELECT id, destination, travel_date, return_date, '' AS notes FROM trips WHERE id = ?"
      : "SELECT id, destination, travel_date, return_date, notes FROM trips WHERE id = ?",
    tripId,
  );
  if (!trip) return null;
  const flights = (await dbAll<Parameters<typeof mapFlight>[0]>(
    `SELECT id, airline, flight_number, from_airport, to_airport, depart_at, arrive_at, confirmation, passengers, terminal_gate
     FROM flights WHERE trip_id = ? ORDER BY sort_order, created_at`,
    tripId,
  )).map(mapFlight);
  const carRentals = (await dbAll<Parameters<typeof mapCar>[0]>(
    `SELECT id, company, confirmation, pickup_place, dropoff_place, pickup_at, dropoff_at, vehicle_class, contact_phone
     FROM car_rentals WHERE trip_id = ? ORDER BY sort_order, created_at`,
    tripId,
  )).map(mapCar);
  const stays = (await dbAll<Parameters<typeof mapStay>[0]>(
    `SELECT id, name, address, check_in, check_out, document_name, document_mime, document_size
     FROM stays WHERE trip_id = ? ORDER BY sort_order, created_at`,
    tripId,
  )).map(mapStay);
  const congregations = (await dbAll<Parameters<typeof mapCongregation>[0]>(
    `SELECT id, name, address, meeting_times, jw_org_url, notes
     FROM congregations WHERE trip_id = ? ORDER BY sort_order, created_at`,
    tripId,
  )).map(mapCongregation);
  const insuranceRow = guest
    ? null
    : await dbGet<{
        provider: string;
        policy_number: string;
        phone: string;
        coverage_start: string | null;
        coverage_end: string | null;
        claim_notes: string;
      }>(
        `SELECT provider, policy_number, phone, coverage_start, coverage_end, claim_notes
         FROM insurance WHERE trip_id = ?`,
        tripId,
      );
  const insurance: Insurance = insuranceRow
    ? {
        provider: insuranceRow.provider,
        policyNumber: insuranceRow.policy_number,
        phone: insuranceRow.phone,
        coverageStart: insuranceRow.coverage_start,
        coverageEnd: insuranceRow.coverage_end,
        claimNotes: insuranceRow.claim_notes,
      }
    : emptyInsurance;
  const insuranceDocuments = guest
    ? []
    : (await dbAll<{
    id: string;
    document_name: string;
    document_mime: string;
    document_size: number;
  }>(
    `SELECT id, document_name, document_mime, document_size
     FROM insurance_documents WHERE trip_id = ? ORDER BY sort_order, created_at`,
    tripId,
  )).map(
    (row): InsuranceDocument => ({
      id: row.id,
      documentName: row.document_name,
      documentMime: row.document_mime,
      documentSize: row.document_size,
    }),
  );
  const tripModel: Trip = {
    id: trip.id,
    destination: trip.destination,
    travelDate: trip.travel_date,
    returnDate: trip.return_date,
    notes: trip.notes,
    role,
  };
  return { trip: tripModel, flights, carRentals, stays, congregations, insurance, insuranceDocuments };
}

export async function getAccessibleBundle(userId: string, tripId: string) {
  const role = await getRole(userId, tripId);
  if (!role) return null;
  return await getBundle(tripId, role);
}

export async function saveOverview(
  tripId: string,
  input: { destination: string; travelDate: string | null; returnDate: string | null; notes: string },
) {
  const destination = text(input.destination, 200);
  if (!destination) throw new Error("Enter where you are going.");
  const travelDate = dateOnly(input.travelDate);
  const returnDate = dateOnly(input.returnDate);
  if (travelDate && returnDate && returnDate < travelDate) {
    throw new Error("The return date must be on or after the travel date.");
  }
  await dbRun(
    `UPDATE trips SET destination = ?, travel_date = ?, return_date = ?, notes = ?, updated_at = ? WHERE id = ?`,
    destination,
    travelDate,
    returnDate,
    text(input.notes, 5000),
    now(),
    tripId,
  );
  const trip = await dbGet<TripRow>(
    "SELECT id, destination, travel_date, return_date, notes FROM trips WHERE id = ?",
    tripId,
  );
  if (!trip) throw new Error("Trip not found.");
  return {
    destination: trip.destination,
    travelDate: trip.travel_date,
    returnDate: trip.return_date,
    notes: trip.notes,
  };
}

export async function saveFlights(tripId: string, flights: Flight[]) {
  const existing = new Set((await dbAll<{ id: string }>("SELECT id FROM flights WHERE trip_id = ?", tripId)).map((row) => row.id));
  const timestamp = now();
  await transaction(async () => {
    const keep = new Set<string>();
    for (const [index, flight] of flights.entries()) {
      const id = existing.has(flight.id) ? flight.id : randomUUID();
      keep.add(id);
      const values = [
        text(flight.airline, 120),
        text(flight.flightNumber, 40),
        text(flight.fromAirport, 120),
        text(flight.toAirport, 120),
        dateTime(flight.departAt),
        dateTime(flight.arriveAt),
        text(flight.confirmation, 80),
        text(flight.passengers, 240),
        text(flight.terminalGate, 80),
      ] as const;
      if (existing.has(id)) {
        await dbRun(
          `UPDATE flights SET airline = ?, flight_number = ?, from_airport = ?, to_airport = ?, depart_at = ?, arrive_at = ?,
           confirmation = ?, passengers = ?, terminal_gate = ?, sort_order = ?, updated_at = ? WHERE id = ? AND trip_id = ?`,
          ...values,
          index,
          timestamp,
          id,
          tripId,
        );
      } else {
        await dbRun(
          `INSERT INTO flights (id, trip_id, airline, flight_number, from_airport, to_airport, depart_at, arrive_at, confirmation, passengers, terminal_gate, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id,
          tripId,
          ...values,
          index,
          timestamp,
          timestamp,
        );
      }
    }
    for (const id of existing) {
      if (!keep.has(id)) await dbRun("DELETE FROM flights WHERE id = ? AND trip_id = ?", id, tripId);
    }
    await touchTrip(tripId);
  });
  return (await getBundle(tripId, "owner"))?.flights ?? [];
}

export async function saveCars(tripId: string, cars: CarRental[]) {
  const existing = new Set(
    (await dbAll<{ id: string }>("SELECT id FROM car_rentals WHERE trip_id = ?", tripId)).map((row) => row.id),
  );
  const timestamp = now();
  await transaction(async () => {
    const keep = new Set<string>();
    for (const [index, car] of cars.entries()) {
      const id = existing.has(car.id) ? car.id : randomUUID();
      keep.add(id);
      const values = [
        text(car.company, 120),
        text(car.confirmation, 80),
        text(car.pickupPlace, 200),
        text(car.dropoffPlace, 200),
        dateTime(car.pickupAt),
        dateTime(car.dropoffAt),
        text(car.vehicleClass, 80),
        text(car.contactPhone, 40),
      ] as const;
      if (existing.has(id)) {
        await dbRun(
          `UPDATE car_rentals SET company = ?, confirmation = ?, pickup_place = ?, dropoff_place = ?, pickup_at = ?, dropoff_at = ?,
           vehicle_class = ?, contact_phone = ?, sort_order = ?, updated_at = ? WHERE id = ? AND trip_id = ?`,
          ...values,
          index,
          timestamp,
          id,
          tripId,
        );
      } else {
        await dbRun(
          `INSERT INTO car_rentals (id, trip_id, company, confirmation, pickup_place, dropoff_place, pickup_at, dropoff_at, vehicle_class, contact_phone, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id,
          tripId,
          ...values,
          index,
          timestamp,
          timestamp,
        );
      }
    }
    for (const id of existing) {
      if (!keep.has(id)) await dbRun("DELETE FROM car_rentals WHERE id = ? AND trip_id = ?", id, tripId);
    }
    await touchTrip(tripId);
  });
  return (await getBundle(tripId, "owner"))?.carRentals ?? [];
}

export type StayWrite = Stay & {
  clearDocument?: boolean;
  file?: { name: string; mime: string; size: number; key: string } | null;
};

export async function saveStays(tripId: string, stays: StayWrite[]) {
  const existingRows = (await dbAll<{ id: string; document_key: string | null }>(
    "SELECT id, document_key FROM stays WHERE trip_id = ?",
    tripId,
  ));
  const existing = new Map(existingRows.map((row) => [row.id, row.document_key]));
  const removedKeys: string[] = [];
  const timestamp = now();
  await transaction(async () => {
    const keep = new Set<string>();
    for (const [index, stay] of stays.entries()) {
      const id = existing.has(stay.id) ? stay.id : randomUUID();
      keep.add(id);
      let documentName = stay.documentName;
      let documentMime = stay.documentMime;
      let documentSize = stay.documentSize;
      let documentKey = existing.get(stay.id) ?? null;
      if (stay.file) {
        if (documentKey) removedKeys.push(documentKey);
        documentName = stay.file.name;
        documentMime = stay.file.mime;
        documentSize = stay.file.size;
        documentKey = stay.file.key;
      } else if (stay.clearDocument && documentKey) {
        removedKeys.push(documentKey);
        documentName = null;
        documentMime = null;
        documentSize = null;
        documentKey = null;
      }
      const values = [text(stay.name, 200), text(stay.address, 400), dateOnly(stay.checkIn), dateOnly(stay.checkOut)] as const;
      if (existing.has(id)) {
        await dbRun(
          `UPDATE stays SET name = ?, address = ?, check_in = ?, check_out = ?, document_name = ?, document_mime = ?, document_size = ?, document_key = ?, sort_order = ?, updated_at = ?
           WHERE id = ? AND trip_id = ?`,
          ...values,
          documentName,
          documentMime,
          documentSize,
          documentKey,
          index,
          timestamp,
          id,
          tripId,
        );
      } else {
        await dbRun(
          `INSERT INTO stays (id, trip_id, name, address, check_in, check_out, document_name, document_mime, document_size, document_key, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id,
          tripId,
          ...values,
          documentName,
          documentMime,
          documentSize,
          documentKey,
          index,
          timestamp,
          timestamp,
        );
      }
    }
    for (const [id, key] of existing) {
      if (!keep.has(id)) {
        if (key) removedKeys.push(key);
        await dbRun("DELETE FROM stays WHERE id = ? AND trip_id = ?", id, tripId);
      }
    }
    await touchTrip(tripId);
  });
  for (const key of removedKeys) await removeStoredFile(key);
  return (await getBundle(tripId, "owner"))?.stays ?? [];
}

export async function saveInsurance(
  tripId: string,
  insurance: Insurance,
  files: { name: string; mime: string; size: number; key: string }[],
) {
  const timestamp = now();
  const count = await dbGet<{ count: number }>(
    "SELECT COUNT(*) AS count FROM insurance_documents WHERE trip_id = ?",
    tripId,
  );
  if (Number(count?.count ?? 0) + files.length > 20) {
    throw new Error("You can attach up to 20 policy documents.");
  }
  await transaction(async () => {
    await dbRun(
      `INSERT INTO insurance (trip_id, provider, policy_number, phone, coverage_start, coverage_end, claim_notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(trip_id) DO UPDATE SET
         provider = excluded.provider,
         policy_number = excluded.policy_number,
         phone = excluded.phone,
         coverage_start = excluded.coverage_start,
         coverage_end = excluded.coverage_end,
         claim_notes = excluded.claim_notes,
         updated_at = excluded.updated_at`,
      tripId,
      text(insurance.provider, 160),
      text(insurance.policyNumber, 80),
      text(insurance.phone, 40),
      dateOnly(insurance.coverageStart),
      dateOnly(insurance.coverageEnd),
      text(insurance.claimNotes, 5000),
      timestamp,
    );
    const start = Number(count?.count ?? 0);
    for (const [index, file] of files.entries()) {
      await dbRun(
        `INSERT INTO insurance_documents (id, trip_id, document_name, document_mime, document_size, document_key, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        randomUUID(),
        tripId,
        file.name,
        file.mime,
        file.size,
        file.key,
        start + index,
        timestamp,
      );
    }
    await touchTrip(tripId);
  });
  const bundle = await getBundle(tripId, "owner");
  return {
    insurance: bundle?.insurance ?? insurance,
    documents: bundle?.insuranceDocuments ?? [],
  };
}

export async function deleteInsuranceDocument(tripId: string, documentId: string) {
  const row = await dbGet<{ document_key: string }>(
    "SELECT document_key FROM insurance_documents WHERE id = ? AND trip_id = ?",
    documentId,
    tripId,
  );
  if (!row) return (await getBundle(tripId, "owner"))?.insuranceDocuments ?? [];
  await dbRun("DELETE FROM insurance_documents WHERE id = ? AND trip_id = ?", documentId, tripId);
  await touchTrip(tripId);
  await removeStoredFile(row.document_key);
  return (await getBundle(tripId, "owner"))?.insuranceDocuments ?? [];
}

export async function saveCongregations(tripId: string, congregations: Congregation[]) {
  for (const congregation of congregations) {
    if (congregation.jwOrgUrl.trim() && !cleanJwUrl(congregation.jwOrgUrl)) {
      throw new Error("Congregation links must be https://www.jw.org addresses.");
    }
  }
  const existing = new Set(
    (await dbAll<{ id: string }>("SELECT id FROM congregations WHERE trip_id = ?", tripId)).map((row) => row.id),
  );
  const timestamp = now();
  await transaction(async () => {
    const keep = new Set<string>();
    for (const [index, congregation] of congregations.entries()) {
      const id = existing.has(congregation.id) ? congregation.id : randomUUID();
      keep.add(id);
      const values = [
        text(congregation.name, 200),
        text(congregation.address, 400),
        text(congregation.meetingTimes, 500),
        cleanJwUrl(congregation.jwOrgUrl),
        text(congregation.notes, 2000),
      ] as const;
      if (existing.has(id)) {
        await dbRun(
          `UPDATE congregations SET name = ?, address = ?, meeting_times = ?, jw_org_url = ?, notes = ?, sort_order = ?, updated_at = ?
           WHERE id = ? AND trip_id = ?`,
          ...values,
          index,
          timestamp,
          id,
          tripId,
        );
      } else {
        await dbRun(
          `INSERT INTO congregations (id, trip_id, name, address, meeting_times, jw_org_url, notes, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id,
          tripId,
          ...values,
          index,
          timestamp,
          timestamp,
        );
      }
    }
    for (const id of existing) {
      if (!keep.has(id)) await dbRun("DELETE FROM congregations WHERE id = ? AND trip_id = ?", id, tripId);
    }
    await touchTrip(tripId);
  });
  return (await getBundle(tripId, "owner"))?.congregations ?? [];
}

export async function deleteOwnedTrips(userId: string) {
  const owned = await dbAll<{ id: string }>("SELECT id FROM trips WHERE owner_user_id = ?", userId);
  for (const trip of owned) await deleteTrip(trip.id);
}

export async function deleteUserProfile(userId: string) {
  await dbRun("DELETE FROM trip_members WHERE user_id = ?", userId);
  await dbRun("DELETE FROM users WHERE id = ?", userId);
}

export async function deleteTrip(tripId: string) {
  const stayKeys = await dbAll<{ document_key: string | null }>(
    "SELECT document_key FROM stays WHERE trip_id = ?",
    tripId,
  );
  const docKeys = await dbAll<{ document_key: string }>(
    "SELECT document_key FROM insurance_documents WHERE trip_id = ?",
    tripId,
  );
  await transaction(async () => {
    await dbRun("DELETE FROM flights WHERE trip_id = ?", tripId);
    await dbRun("DELETE FROM car_rentals WHERE trip_id = ?", tripId);
    await dbRun("DELETE FROM stays WHERE trip_id = ?", tripId);
    await dbRun("DELETE FROM congregations WHERE trip_id = ?", tripId);
    await dbRun("DELETE FROM insurance_documents WHERE trip_id = ?", tripId);
    await dbRun("DELETE FROM insurance WHERE trip_id = ?", tripId);
    await dbRun("DELETE FROM share_links WHERE trip_id = ?", tripId);
    await dbRun("DELETE FROM trip_members WHERE trip_id = ?", tripId);
    await dbRun("DELETE FROM trips WHERE id = ?", tripId);
  });
  for (const row of stayKeys) await removeStoredFile(row.document_key);
  for (const row of docKeys) await removeStoredFile(row.document_key);
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function insertShare(tripId: string) {
  const token = randomBytes(12).toString("base64url");
  await dbRun(
    "INSERT INTO share_links (id, trip_id, token_hash, label, created_at, revoked_at, last_used_at) VALUES (?, ?, ?, NULL, ?, NULL, NULL)",
    randomUUID(),
    tripId,
    hashToken(token),
    now(),
  );
  return token;
}

export async function createShare(tripId: string) {
  return await insertShare(tripId);
}

export async function rotateShare(tripId: string) {
  let token = "";
  await transaction(async () => {
    await dbRun(
      "UPDATE share_links SET revoked_at = ? WHERE trip_id = ? AND revoked_at IS NULL",
      now(),
      tripId,
    );
    token = await insertShare(tripId);
  });
  return token;
}

export async function revokeShare(tripId: string, linkId: string) {
  await dbRun(
    "UPDATE share_links SET revoked_at = ? WHERE id = ? AND trip_id = ? AND revoked_at IS NULL",
    now(),
    linkId,
    tripId,
  );
}

function toShareLink(row: { id: string; created_at: string; last_used_at: string | null; revoked_at: string | null }): ShareLinkInfo {
  return {
    id: row.id,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
  };
}

export async function listShareLinks(tripId: string): Promise<ShareLinkInfo[]> {
  const active = await dbGet<{ id: string; created_at: string; last_used_at: string | null; revoked_at: string | null }>(
    `SELECT id, created_at, last_used_at, revoked_at FROM share_links
     WHERE trip_id = ? AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    tripId,
  );
  const revoked = await dbGet<{ id: string; created_at: string; last_used_at: string | null; revoked_at: string | null }>(
    `SELECT id, created_at, last_used_at, revoked_at FROM share_links
     WHERE trip_id = ? AND revoked_at IS NOT NULL ORDER BY revoked_at DESC LIMIT 1`,
    tripId,
  );
  return [active, revoked].filter((row) => row !== undefined).map(toShareLink);
}

export async function findActiveShare(token: string) {
  const row = await dbGet<{ id: string; trip_id: string }>(
    "SELECT id, trip_id FROM share_links WHERE token_hash = ? AND revoked_at IS NULL",
    hashToken(token.trim()),
  );
  if (!row) return null;
  return { id: row.id, tripId: row.trip_id };
}

export async function markShareUsed(shareId: string) {
  await dbRun("UPDATE share_links SET last_used_at = ? WHERE id = ?", now(), shareId);
}

let guestAccessReady: Promise<void> | null = null;

function ensureGuestAccess() {
  guestAccessReady ??= (async () => {
    try {
      await transaction(async () => {
        await dbRun("SET LOCAL lock_timeout = '3s'");
        await dbRun(
          `CREATE TABLE IF NOT EXISTS trip_guest_emails (
            trip_id text not null references trips (id) on delete cascade,
            email text not null,
            created_at text not null,
            primary key (trip_id, email)
          )`,
        );
        await dbRun(
          `CREATE TABLE IF NOT EXISTS guest_passkeys (
            credential_id text primary key,
            owner_user_id uuid not null references users (id) on delete cascade,
            email text not null,
            public_key text not null,
            counter integer not null default 0,
            gate integer not null,
            created_at text not null
          )`,
        );
        await dbRun("CREATE INDEX IF NOT EXISTS idx_guest_passkeys_owner ON guest_passkeys (owner_user_id, email)");
        await dbRun("ALTER TABLE trip_guest_emails ENABLE ROW LEVEL SECURITY");
        await dbRun("ALTER TABLE guest_passkeys ENABLE ROW LEVEL SECURITY");
      });
    } catch (error) {
      guestAccessReady = null;
      if (!isLockTimeout(error)) throw error;
    }
  })().catch((error) => {
    guestAccessReady = null;
    throw error;
  });
  return guestAccessReady;
}

export function normalizeGuestEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return null;
  return email;
}

export async function listGuestEmails(tripId: string) {
  await ensureGuestAccess();
  const rows = await dbAll<{ email: string }>(
    "SELECT email FROM trip_guest_emails WHERE trip_id = ? ORDER BY email",
    tripId,
  );
  return rows.map((row) => row.email);
}

export async function addGuestEmail(tripId: string, email: string) {
  await ensureGuestAccess();
  const existing = await listGuestEmails(tripId);
  if (existing.includes(email)) return existing;
  if (existing.length >= 30) throw new Error("You can add up to 30 emails.");
  await dbRun(
    "INSERT INTO trip_guest_emails (trip_id, email, created_at) VALUES (?, ?, ?)",
    tripId,
    email,
    now(),
  );
  return await listGuestEmails(tripId);
}

export async function removeGuestEmail(tripId: string, email: string) {
  await ensureGuestAccess();
  await dbRun("DELETE FROM trip_guest_emails WHERE trip_id = ? AND email = ?", tripId, email);
  return await listGuestEmails(tripId);
}

export async function guestEmailAllowed(tripId: string, email: string) {
  await ensureGuestAccess();
  const row = await dbGet<{ email: string }>(
    "SELECT email FROM trip_guest_emails WHERE trip_id = ? AND email = ?",
    tripId,
    email,
  );
  return Boolean(row);
}

export async function tripOwnerId(tripId: string) {
  const row = await dbGet<{ owner_user_id: string }>("SELECT owner_user_id FROM trips WHERE id = ?", tripId);
  return row?.owner_user_id ?? null;
}

export async function listGuestPasskeyIds(ownerId: string, email: string) {
  await ensureGuestAccess();
  const rows = await dbAll<{ credential_id: string }>(
    "SELECT credential_id FROM guest_passkeys WHERE owner_user_id = ? AND email = ?",
    ownerId,
    email,
  );
  return rows.map((row) => row.credential_id);
}

export async function saveGuestPasskey(input: {
  credentialId: string;
  ownerId: string;
  email: string;
  publicKey: string;
  counter: number;
  gate: number;
}) {
  await ensureGuestAccess();
  await dbRun(
    `INSERT INTO guest_passkeys (credential_id, owner_user_id, email, public_key, counter, gate, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    input.credentialId,
    input.ownerId,
    input.email,
    input.publicKey,
    input.counter,
    input.gate,
    now(),
  );
}

export async function findGuestPasskey(credentialId: string) {
  await ensureGuestAccess();
  const row = await dbGet<{
    credential_id: string;
    owner_user_id: string;
    email: string;
    public_key: string;
    counter: number | string;
    gate: number | string;
  }>(
    "SELECT credential_id, owner_user_id, email, public_key, counter, gate FROM guest_passkeys WHERE credential_id = ?",
    credentialId,
  );
  if (!row) return null;
  return {
    credentialId: row.credential_id,
    ownerId: row.owner_user_id,
    email: row.email,
    publicKey: row.public_key,
    counter: Number(row.counter),
    gate: Number(row.gate),
  };
}

export async function updateGuestPasskeyCounter(credentialId: string, counter: number) {
  await ensureGuestAccess();
  await dbRun("UPDATE guest_passkeys SET counter = ? WHERE credential_id = ?", counter, credentialId);
}

export async function shareIsActive(shareId: string, tripId: string) {
  const row = await dbGet<{ id: string }>(
    "SELECT id FROM share_links WHERE id = ? AND trip_id = ? AND revoked_at IS NULL",
    shareId,
    tripId,
  );
  return Boolean(row);
}

export async function listMembers(tripId: string): Promise<Member[]> {
  return (await dbAll<{ user_id: string; name: string; email: string; role: Role }>(
    `SELECT u.id AS user_id, u.name, u.email, m.role
     FROM trip_members m JOIN users u ON u.id = m.user_id
     WHERE m.trip_id = ?
     ORDER BY CASE m.role WHEN 'owner' THEN 0 ELSE 1 END, u.email`,
    tripId,
  )).map((row) => ({
    userId: row.user_id,
    name: row.name,
    email: row.email,
    role: row.role,
  }));
}

export async function addCollaborator(tripId: string, ownerId: string, email: string) {
  const account = await findUserByEmail(email);
  if (!account) {
    throw new Error("No account with that email. They need to register first.");
  }
  if (account.id === ownerId) throw new Error("You already own this trip.");
  const existing = await getRole(account.id, tripId);
  if (existing) throw new Error("They already have access.");
  await dbRun(
    "INSERT INTO trip_members (trip_id, user_id, role, created_at) VALUES (?, ?, 'collaborator', ?)",
    tripId,
    account.id,
    now(),
  );
  return await listMembers(tripId);
}

export async function removeCollaborator(tripId: string, userId: string) {
  const role = await dbGet<{ role: Role }>("SELECT role FROM trip_members WHERE trip_id = ? AND user_id = ?", tripId, userId);
  if (role?.role === "owner") throw new Error("The owner cannot be removed.");
  await dbRun("DELETE FROM trip_members WHERE trip_id = ? AND user_id = ? AND role = 'collaborator'", tripId, userId);
  return await listMembers(tripId);
}

export async function getStayFile(stayId: string) {
  return (
    await dbGet<{ trip_id: string; document_name: string; document_mime: string; document_key: string }>(
      `SELECT trip_id, document_name, document_mime, document_key FROM stays
       WHERE id = ? AND document_key IS NOT NULL`,
      stayId,
    ) ?? null
  );
}

export async function getInsuranceFile(documentId: string) {
  return (
    await dbGet<{ trip_id: string; document_name: string; document_mime: string; document_key: string }>(
      "SELECT trip_id, document_name, document_mime, document_key FROM insurance_documents WHERE id = ?",
      documentId,
    ) ?? null
  );
}
