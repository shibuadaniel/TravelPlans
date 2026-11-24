/**
 * Itinerary timeline: a day-by-day view built from a trip's entries.
 *
 * Flights and stays are not copied anywhere. The timeline is rebuilt from the
 * trip bundle each time it is shown. Events added on the timeline itself come
 * from the itinerary_events table. To add another kind of point (car pickups,
 * insurance cover...), write another `ItinerarySource` and add it to
 * `ITINERARY_SOURCES`.
 *
 * Flight times are local wall-clock strings ("YYYY-MM-DDTHH:mm"). The day
 * heading stays on that local date. Flights are listed in trip order: each
 * flight's departure, then its arrival, then the next flight. Which flight
 * comes first follows the real departure time at the airport.
 *
 * Every source must cope with missing or backwards dates: skip the bad part
 * and report it as an issue instead of throwing.
 */
import { arrivalBeforeDeparture, placeInstant } from "@/lib/flight-time";
import { calendarDayNumber } from "@/lib/format";
import type { Flight, Stay, TripBundle, TripEvent } from "@/lib/types";

/** Calendar day as "YYYY-MM-DD". */
export type DateKey = string;

export type ItineraryPointKind =
  | "flight-depart"
  | "flight-arrive"
  | "stay-check-in"
  | "stay-check-out"
  | "custom-event";

export type ItineraryPoint = {
  id: string;
  kind: ItineraryPointKind;
  date: DateKey;
  /** Minutes after midnight. Null for all-day points. */
  minutes: number | null;
  /** Orders all-day points among timed ones within a day. */
  sortMinutes: number;
  /** UTC milliseconds used to order points. Flight rows use the airport zone. */
  sortAt: number;
  /** Set on flight rows so a flight's departure and arrival stay together. */
  flightOrder?: number;
  title: string;
  detail: string;
  /** Set for events added on the timeline, so the UI can open them for editing. */
  record?: TripEvent;
};

export type ItineraryIssue = { id: string; message: string };

export type ItineraryDay = {
  date: DateKey;
  /** 1-based day of the trip; null for days outside the trip range. */
  dayNumber: number | null;
  outsideTrip: boolean;
  points: ItineraryPoint[];
};

export type Itinerary = {
  start: DateKey | null;
  end: DateKey | null;
  days: ItineraryDay[];
  issues: ItineraryIssue[];
};

type SourceResult = {
  points: ItineraryPoint[];
  issues: ItineraryIssue[];
  /** Trip start/end suggested by this source (first landing, last takeoff). */
  arrival?: DateKey;
  departure?: DateKey;
  /** Point ids that may be dropped silently when they fall outside the trip. */
  optionalOutsideTrip?: Set<string>;
};

type ItinerarySource = (bundle: TripBundle) => SourceResult;

/** Longest trip for which every day (including empty ones) is listed. */
const MAX_FILLED_DAYS = 90;

// ---------------------------------------------------------------------------
// Date helpers

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Calendar day of a date or date-time string, or null when it isn't a real day. */
export function toDateKey(value: string | null | undefined): DateKey | null {
  const day = calendarDayNumber(value);
  if (day === null) return null;
  return (value ?? "").trim().slice(0, 10);
}

/** Day and minutes of a "YYYY-MM-DDTHH:mm" wall-clock time. */
function wallClock(value: string | null | undefined): { date: DateKey; minutes: number } | null {
  const date = toDateKey(value);
  if (!date) return null;
  const match = /T(\d{2}):(\d{2})/.exec((value ?? "").trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { date, minutes: hour * 60 + minute };
}

function keyToUtcMs(key: DateKey) {
  return Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)));
}

function addDays(key: DateKey, n: number): DateKey {
  const d = new Date(keyToUtcMs(key) + n * 86_400_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function daysBetween(a: DateKey, b: DateKey) {
  return Math.round((keyToUtcMs(b) - keyToUtcMs(a)) / 86_400_000);
}

function minKey(keys: DateKey[]) {
  return keys.length ? keys.reduce((a, b) => (b < a ? b : a)) : null;
}

function maxKey(keys: DateKey[]) {
  return keys.length ? keys.reduce((a, b) => (b > a ? b : a)) : null;
}

function at(date: DateKey, sortMinutes: number) {
  return keyToUtcMs(date) + sortMinutes * 60_000;
}

// ---------------------------------------------------------------------------
// Sources

function flightLabel(flight: Flight, index: number) {
  const airline = flight.airline.trim();
  const number = flight.flightNumber.trim();
  return [airline, number].filter(Boolean).join(" ") || `Flight ${index + 1}`;
}

const flightSource: ItinerarySource = ({ flights }) => {
  const points: ItineraryPoint[] = [];
  const issues: ItineraryIssue[] = [];
  const optionalOutsideTrip = new Set<string>();

  const timed = flights.map((flight, index) => ({
    flight,
    index,
    depart: wallClock(flight.departAt),
    arrive: wallClock(flight.arriveAt),
  }));

  for (const { flight, index, depart, arrive } of timed) {
    if (!depart && !arrive) {
      issues.push({
        id: `flight-nodate-${flight.id}`,
        message: `${flightLabel(flight, index)} has no departure or arrival time, so it isn't on the itinerary.`,
      });
    }
  }

  const flightStart = (item: (typeof timed)[number]) => {
    if (item.depart) return placeInstant(item.flight.fromAirport, item.flight.departAt) ?? at(item.depart.date, item.depart.minutes);
    if (item.arrive) return placeInstant(item.flight.toAirport, item.flight.arriveAt) ?? at(item.arrive.date, item.arrive.minutes);
    return 0;
  };
  const dated = timed
    .filter((f) => f.depart || f.arrive)
    .sort((a, b) => flightStart(a) - flightStart(b) || a.index - b.index);

  dated.forEach(({ flight, index, depart, arrive }, flightOrder) => {
    const label = flightLabel(flight, index);
    const from = flight.fromAirport.trim();
    const to = flight.toAirport.trim();
    if (depart && arrive && arrivalBeforeDeparture(flight)) {
      issues.push({
        id: `flight-backwards-${flight.id}`,
        message: `${label} arrives before it departs in real time. Both are shown; check the airports and times.`,
      });
    }
    const departAt = depart ? placeInstant(from, flight.departAt) ?? at(depart.date, depart.minutes) : null;
    let arriveAt = arrive ? placeInstant(to, flight.arriveAt) ?? at(arrive.date, arrive.minutes) : null;
    if (departAt !== null && arriveAt !== null && arriveAt === departAt) arriveAt += 1;
    if (depart && departAt !== null) {
      points.push({
        id: `flight-depart-${flight.id}`,
        kind: "flight-depart",
        date: depart.date,
        minutes: depart.minutes,
        sortMinutes: depart.minutes,
        sortAt: departAt,
        flightOrder,
        title: from ? `Depart from ${from}` : "Depart",
        detail: to ? `${label} to ${to}` : label,
      });
    }
    if (arrive && arriveAt !== null) {
      points.push({
        id: `flight-arrive-${flight.id}`,
        kind: "flight-arrive",
        date: arrive.date,
        minutes: arrive.minutes,
        sortMinutes: arrive.minutes,
        sortAt: arriveAt,
        flightOrder,
        title: to ? `Arrive ${to}` : "Arrive",
        detail: from ? `${label} from ${from}` : label,
      });
    }
  });

  // Every flight keeps both rows. The first departure can open the itinerary,
  // and the last landing can close it, even when those days sit outside the
  // trip's own dates.
  const first = dated[0];
  const last = dated.length > 1 ? dated[dated.length - 1] : undefined;

  const find = (id: string) => points.find((p) => p.id === id);
  const firstArrive = first
    ? find(`flight-arrive-${first.flight.id}`) ?? find(`flight-depart-${first.flight.id}`)
    : undefined;
  const lastDepart = last
    ? find(`flight-depart-${last.flight.id}`) ?? find(`flight-arrive-${last.flight.id}`)
    : undefined;

  return {
    points,
    issues,
    arrival: firstArrive?.date,
    departure: lastDepart?.date,
    optionalOutsideTrip,
  };
};

function stayLabel(stay: Stay, index: number) {
  return stay.name.trim() || `Stay ${index + 1}`;
}

// Stay points have no time: check-outs open the day and check-ins close it,
// so a travel day reads "check out, fly" and "land, check in".
const CHECK_OUT_SORT = -1;
const CHECK_IN_SORT = 24 * 60;

const staySource: ItinerarySource = ({ stays }) => {
  const points: ItineraryPoint[] = [];
  const issues: ItineraryIssue[] = [];

  stays.forEach((stay, index) => {
    const label = stayLabel(stay, index);
    const checkIn = toDateKey(stay.checkIn);
    let checkOut = toDateKey(stay.checkOut);

    if (!checkIn && !checkOut) {
      issues.push({
        id: `stay-nodate-${stay.id}`,
        message: `${label} has no check-in or check-out date, so it isn't on the itinerary.`,
      });
      return;
    }
    if (checkIn && checkOut && checkOut < checkIn) {
      issues.push({
        id: `stay-backwards-${stay.id}`,
        message: `${label} checks out before it checks in. Only check-in is shown; check the dates.`,
      });
      checkOut = null;
    }
    const nights = checkIn && checkOut ? daysBetween(checkIn, checkOut) : null;
    const address = stay.address.trim();

    if (checkIn) {
      const parts: string[] = [];
      if (nights !== null && nights > 0) parts.push(`${nights} night${nights === 1 ? "" : "s"}`);
      if (address) parts.push(address);
      points.push({
        id: `stay-in-${stay.id}`,
        kind: "stay-check-in",
        date: checkIn,
        minutes: null,
        sortMinutes: CHECK_IN_SORT,
        sortAt: at(checkIn, CHECK_IN_SORT),
        title: `Check in: ${label}`,
        detail: parts.join(" · "),
      });
    }
    if (checkOut) {
      points.push({
        id: `stay-out-${stay.id}`,
        kind: "stay-check-out",
        date: checkOut,
        minutes: null,
        sortMinutes: CHECK_OUT_SORT,
        sortAt: at(checkOut, CHECK_OUT_SORT),
        title: `Check out: ${label}`,
        detail: "",
      });
    }
  });

  return { points, issues };
};

// Events added on the timeline have no time yet: they sit mid-day, after
// arrivals and check-outs and before check-ins, in the order they were added.
const CUSTOM_EVENT_SORT = 12 * 60;

const customEventSource: ItinerarySource = ({ events }) => {
  const points: ItineraryPoint[] = [];
  const issues: ItineraryIssue[] = [];
  (events ?? []).forEach((record, index) => {
    const date = toDateKey(record.eventDate);
    if (!date) {
      issues.push({
        id: `event-nodate-${record.id}`,
        message: `"${record.title}" has no valid date, so it isn't on the itinerary.`,
      });
      return;
    }
    points.push({
      id: `event-${record.id}`,
      kind: "custom-event",
      date,
      minutes: null,
      sortMinutes: CUSTOM_EVENT_SORT + index / 1000,
      sortAt: at(date, CUSTOM_EVENT_SORT + index / 1000),
      title: record.title,
      detail: record.description,
      record,
    });
  });
  return { points, issues };
};

/** Every source that adds points to the timeline, in priority order. */
export const ITINERARY_SOURCES: ItinerarySource[] = [flightSource, staySource, customEventSource];

// A flight is one block: departure, then arrival. Other rows sit before or
// after the whole flight, beside whichever flight leaves next.
function orderDay(points: ItineraryPoint[]) {
  const flights = new Map<number, ItineraryPoint[]>();
  const groups: { at: number; order: number; points: ItineraryPoint[] }[] = [];
  for (const point of points) {
    if (point.flightOrder === undefined) {
      groups.push({ at: point.sortAt, order: point.sortAt, points: [point] });
      continue;
    }
    const list = flights.get(point.flightOrder) ?? [];
    list.push(point);
    flights.set(point.flightOrder, list);
  }
  for (const [order, list] of flights) {
    list.sort((a, b) => (a.kind === "flight-arrive" ? 1 : 0) - (b.kind === "flight-arrive" ? 1 : 0));
    const depart = list.find((point) => point.kind === "flight-depart");
    groups.push({ at: (depart ?? list[0]).sortAt, order, points: list });
  }
  groups.sort((a, b) => a.at - b.at || a.order - b.order);
  return groups.flatMap((group) => group.points);
}

// ---------------------------------------------------------------------------
// Build

export function buildItinerary(bundle: TripBundle, sources: ItinerarySource[] = ITINERARY_SOURCES): Itinerary {
  const points: ItineraryPoint[] = [];
  const issues: ItineraryIssue[] = [];
  const optional = new Set<string>();
  let arrival: DateKey | undefined;
  let departure: DateKey | undefined;

  for (const source of sources) {
    let result: SourceResult;
    try {
      result = source(bundle);
    } catch {
      // A bad entry must never take the whole page down.
      issues.push({
        id: `source-error-${issues.length}`,
        message: "Some entries couldn't be read and were left off the itinerary.",
      });
      continue;
    }
    points.push(...result.points);
    issues.push(...result.issues);
    result.optionalOutsideTrip?.forEach((id) => optional.add(id));
    arrival ??= result.arrival;
    departure ??= result.departure;
  }

  // Fall back to the trip's own dates, then to whatever the entries cover.
  // The outbound departure opens the itinerary even when the trip date is the arrival.
  const pointDates = points.map((p) => p.date);
  const flightDates = points
    .filter((point) => point.kind === "flight-depart" || point.kind === "flight-arrive")
    .map((point) => point.date);
  const outbound = minKey(flightDates);
  const inbound = maxKey(flightDates);
  let start: DateKey | null = arrival ?? toDateKey(bundle.trip.travelDate) ?? minKey(pointDates);
  if (outbound && (!start || outbound < start)) start = outbound;
  let end: DateKey | null = departure ?? toDateKey(bundle.trip.returnDate) ?? maxKey(pointDates);
  if (inbound && (!end || inbound > end)) end = inbound;

  if (start && end && end < start) {
    issues.push({
      id: "trip-backwards",
      message:
        "The trip ends before it starts, so the itinerary runs between the two dates in order. Check the flight or trip dates.",
    });
    [start, end] = [end, start];
  }
  start ??= end;
  end ??= start;

  if (!start || !end) return { start: null, end: null, days: [], issues };
  const first = start;
  const last = end;

  // Drop the expected home-side flight legs outside the trip; flag the rest.
  const kept = points.filter((p) => !((p.date < first || p.date > last) && optional.has(p.id)));
  const outsideCount = kept.filter((p) => p.date < first || p.date > last).length;
  if (outsideCount > 0) {
    issues.push({
      id: "outside-trip",
      message: `${outsideCount} ${outsideCount === 1 ? "entry falls" : "entries fall"} outside the trip dates and ${
        outsideCount === 1 ? "is" : "are"
      } marked on the itinerary.`,
    });
  }

  const byDate = new Map<DateKey, ItineraryPoint[]>();
  for (const p of kept) {
    const list = byDate.get(p.date) ?? [];
    list.push(p);
    byDate.set(p.date, list);
  }

  const span = daysBetween(first, last) + 1;
  const dates = new Set<DateKey>(byDate.keys());
  if (span <= MAX_FILLED_DAYS) {
    for (let i = 0; i < span; i += 1) dates.add(addDays(first, i));
  } else {
    issues.push({
      id: "long-trip",
      message: `The trip spans ${span} days, so only days with plans are listed.`,
    });
  }

  const days: ItineraryDay[] = [...dates].sort().map((date) => {
    const outsideTrip = date < first || date > last;
    return {
      date,
      dayNumber: outsideTrip ? null : daysBetween(first, date) + 1,
      outsideTrip,
      points: orderDay(byDate.get(date) ?? []),
    };
  });

  return { start: first, end: last, days, issues };
}

// ---------------------------------------------------------------------------
// Display helpers. Fixed English names so the server and browser match.

export function formatDayHeading(date: DateKey) {
  const d = new Date(keyToUtcMs(date));
  return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function formatMinutes(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${pad(minute)} ${hour < 12 ? "AM" : "PM"}`;
}
