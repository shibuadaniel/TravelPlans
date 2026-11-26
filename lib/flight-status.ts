import "server-only";

import type { Flight, FlightStatusChip } from "@/lib/types";

const TEN_MINUTES = 10 * 60 * 1000;

const AIRLINES: Record<string, string> = {
  "air canada": "AC",
  "air france": "AF",
  "air india": "AI",
  "alaska": "AS",
  "alaska airlines": "AS",
  "american": "AA",
  "american airlines": "AA",
  "ana": "NH",
  "british airways": "BA",
  "cathay": "CX",
  "cathay pacific": "CX",
  "delta": "DL",
  "delta air lines": "DL",
  "easyjet": "U2",
  "emirates": "EK",
  "etihad": "EY",
  "frontier": "F9",
  "indigo": "6E",
  "japan airlines": "JL",
  "jetblue": "B6",
  "jetstar": "JQ",
  "klm": "KL",
  "lufthansa": "LH",
  "qantas": "QF",
  "qatar": "QR",
  "qatar airways": "QR",
  "ryanair": "FR",
  "singapore airlines": "SQ",
  "southwest": "WN",
  "spirit": "NK",
  "turkish": "TK",
  "turkish airlines": "TK",
  "united": "UA",
  "united airlines": "UA",
  "virgin australia": "VA",
  "westjet": "WS",
};

type StatusRow = {
  flight_date?: string;
  flight_status?: string;
  departure?: { iata?: string; delay?: number | null; scheduled?: string };
};

type CacheEntry = { at: number; chip: FlightStatusChip | null };

function cacheMap() {
  const store = globalThis as { travelFlightStatus?: Map<string, CacheEntry> };
  store.travelFlightStatus ??= new Map();
  return store.travelFlightStatus;
}

function airlineCode(airline: string) {
  const trimmed = airline.trim();
  if (/^[A-Za-z0-9]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  const key = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  return AIRLINES[key] ?? null;
}

export function flightIata(airline: string, flightNumber: string) {
  const compact = flightNumber.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  // A bare number such as 735 also matches a two-character prefix. Require a letter
  // in that prefix so the airline name is used to build the real code.
  if (/^[A-Z0-9]{2}\d{1,4}[A-Z]?$/.test(compact) && /[A-Z]/.test(compact.slice(0, 2))) return compact;
  const code = airlineCode(airline);
  const digits = compact.replace(/\D/g, "");
  if (!code || !digits) return null;
  return `${code}${digits}`;
}

function dayStamp(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const SCHEDULED: FlightStatusChip = { label: "Scheduled", color: "default" };

function departureDay(departAt: string | null) {
  if (!departAt || !/^\d{4}-\d{2}-\d{2}/.test(departAt)) return null;
  return departAt.slice(0, 10);
}

function calendarToday() {
  return dayStamp(new Date());
}

function utcToday() {
  return new Date().toISOString().slice(0, 10);
}

/** Departure day is still today or later on the server clock or in UTC. */
function stillAhead(day: string) {
  const local = calendarToday();
  const utc = utcToday();
  return day >= local || day >= utc;
}

function notYet(day: string) {
  return day > calendarToday() && day > utcToday();
}

function operatingToday(departAt: string | null) {
  const day = departureDay(departAt);
  if (!day || notYet(day)) return false;
  const now = new Date();
  for (const offset of [-1, 0]) {
    const local = new Date(now);
    local.setDate(now.getDate() + offset);
    const utc = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
    if (day === dayStamp(local) || day === utc.toISOString().slice(0, 10)) return true;
  }
  return false;
}

function chipFor(row: StatusRow): FlightStatusChip {
  const status = (row.flight_status ?? "").toLowerCase();
  const delay = Number(row.departure?.delay ?? 0);
  if (status === "cancelled") return { label: "Cancelled", color: "error" };
  if (status === "diverted") return { label: "Diverted", color: "warning" };
  if (status === "incident") return { label: "Incident", color: "error" };
  if (status === "landed") return { label: "Landed", color: "success" };
  if (delay > 0 && (status === "scheduled" || status === "active")) return { label: "Delayed", color: "warning" };
  if (status === "active") return { label: "In the air", color: "info" };
  if (status === "scheduled") return { label: "On time", color: "success" };
  return { label: "Scheduled", color: "default" };
}

function rowDays(row: StatusRow) {
  const days = new Set<string>();
  if (row.flight_date && /^\d{4}-\d{2}-\d{2}/.test(row.flight_date)) days.add(row.flight_date.slice(0, 10));
  const scheduled = row.departure?.scheduled ?? "";
  if (/^\d{4}-\d{2}-\d{2}/.test(scheduled)) days.add(scheduled.slice(0, 10));
  return days;
}

function matchingRow(rows: StatusRow[], flight: Flight) {
  const day = flight.departAt?.slice(0, 10) ?? "";
  const from = flight.fromAirport.trim().toUpperCase();
  const sameDay = rows.filter((row) => day && rowDays(row).has(day));
  const pool = sameDay.length > 0 ? sameDay : [];
  if (from.length === 3) {
    const airport = pool.find((row) => row.departure?.iata?.toUpperCase() === from);
    if (airport) return airport;
  }
  return pool[0] ?? null;
}

const LOOKUP_MS = 8000;

async function lookup(iata: string, flight: Flight): Promise<{ chip: FlightStatusChip | null; complete: boolean }> {
  const key = process.env.AVIATIONSTACK_ACCESS_KEY?.trim();
  if (!key) return { chip: null, complete: false };
  const params = new URLSearchParams({
    access_key: key,
    flight_iata: iata,
    limit: "8",
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_MS);
  try {
    const response = await fetch(`https://api.aviationstack.com/v1/flights?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return { chip: null, complete: true };
    const payload = (await response.json()) as { data?: StatusRow[]; error?: unknown };
    if (payload.error || !payload.data) return { chip: null, complete: true };
    const row = matchingRow(payload.data, flight);
    return { chip: row ? chipFor(row) : null, complete: true };
  } catch {
    return { chip: null, complete: false };
  } finally {
    clearTimeout(timer);
  }
}

export function previewFlightStatuses(flights: Flight[]): Record<string, FlightStatusChip> {
  const result: Record<string, FlightStatusChip> = {};
  for (const flight of flights) {
    const day = departureDay(flight.departAt);
    if (day && stillAhead(day)) result[flight.id] = SCHEDULED;
  }
  return result;
}

export async function flightStatuses(flights: Flight[]): Promise<Record<string, FlightStatusChip>> {
  const key = process.env.AVIATIONSTACK_ACCESS_KEY?.trim();
  const cache = cacheMap();
  const now = Date.now();
  const result: Record<string, FlightStatusChip> = {};
  const pending: Promise<void>[] = [];

  for (const flight of flights) {
    const day = departureDay(flight.departAt);
    const scheduled = () => {
      if (day && stillAhead(day)) result[flight.id] = SCHEDULED;
    };
    if (day && notYet(day)) {
      scheduled();
      continue;
    }
    if (!key) {
      scheduled();
      continue;
    }
    const iata = flightIata(flight.airline, flight.flightNumber);
    if (!iata || !operatingToday(flight.departAt)) {
      scheduled();
      continue;
    }
    const cached = cache.get(iata);
    if (cached && now - cached.at < TEN_MINUTES) {
      if (cached.chip) result[flight.id] = cached.chip;
      else scheduled();
      continue;
    }
    pending.push(
      lookup(iata, flight).then(({ chip, complete }) => {
        if (complete) cache.set(iata, { at: Date.now(), chip });
        if (chip) result[flight.id] = chip;
        else scheduled();
      }),
    );
  }

  await Promise.race([
    Promise.all(pending),
    new Promise((resolve) => setTimeout(resolve, LOOKUP_MS + 500)),
  ]);
  for (const flight of flights) {
    if (result[flight.id]) continue;
    const day = departureDay(flight.departAt);
    if (day && stillAhead(day)) result[flight.id] = SCHEDULED;
  }
  return result;
}
