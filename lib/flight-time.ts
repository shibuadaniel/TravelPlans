import airports from "./airports.json";

const MAX_ZONE_GAP_MS = 26 * 60 * 60 * 1000;

type AirportData = {
  zones: string[];
  iata: Record<string, number>;
  city: Record<string, number>;
};

const data = airports as AirportData;

export const ARRIVAL_BEFORE_DEPARTURE =
  "This arrival is before the departure in real time. Check the airports and times.";

function oneEditApart(a: string, b: string) {
  const delta = a.length - b.length;
  if (a === b || Math.abs(delta) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (delta === 0) {
      i += 1;
      j += 1;
    } else if (delta > 0) i += 1;
    else j += 1;
  }
  if (i < a.length || j < b.length) edits += 1;
  return edits === 1;
}

function cityZone(city: string) {
  const exact = data.city[city];
  if (exact !== undefined) return data.zones[exact] ?? null;
  const matches = Object.keys(data.city).filter((name) => oneEditApart(name, city));
  if (matches.length !== 1) return null;
  return data.zones[data.city[matches[0]]] ?? null;
}

function zoneFor(value: string | null | undefined) {
  const text = (value ?? "").trim();
  if (!text) return null;
  const paren = /\(([A-Za-z]{3})\)/.exec(text);
  const code = paren?.[1] ?? (/^[A-Za-z]{3}$/.test(text) ? text : null);
  if (code) {
    const id = data.iata[code.toUpperCase()];
    if (id !== undefined) return data.zones[id] ?? null;
  }
  const city = text.split(",")[0]?.trim().toLowerCase();
  if (!city) return null;
  return cityZone(city);
}

/** UTC milliseconds of a wall-clock time at an airport, when the place is known. */
export function placeInstant(place: string | null | undefined, local: string | null | undefined) {
  if (!local) return null;
  const zone = zoneFor(place);
  if (!zone) return null;
  return zonedLocalToUtc(local, zone);
}

function wallAsUtc(timeZone: string, utcMs: number) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(utcMs))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const hour = Number(parts.hour) === 24 ? 0 : Number(parts.hour);
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), hour, Number(parts.minute), Number(parts.second));
}

function zonedLocalToUtc(local: string, timeZone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local.trim());
  if (!match) return null;
  const desired = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  let utc = desired;
  for (let pass = 0; pass < 3; pass += 1) {
    const delta = desired - wallAsUtc(timeZone, utc);
    if (delta === 0) return utc;
    utc += delta;
  }
  return utc;
}

function naiveMs(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value.trim());
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4] ?? 0), Number(match[5] ?? 0));
}

export function arrivalBeforeDeparture(flight: {
  fromAirport: string;
  toAirport: string;
  departAt: string | null;
  arriveAt: string | null;
}) {
  if (!flight.departAt || !flight.arriveAt) return false;
  const from = zoneFor(flight.fromAirport);
  const to = zoneFor(flight.toAirport);
  if (from && to) {
    const depart = zonedLocalToUtc(flight.departAt, from);
    const arrive = zonedLocalToUtc(flight.arriveAt, to);
    if (depart !== null && arrive !== null) return arrive < depart;
  }
  const depart = naiveMs(flight.departAt);
  const arrive = naiveMs(flight.arriveAt);
  if (depart === null || arrive === null) return false;
  return depart - arrive > MAX_ZONE_GAP_MS;
}
