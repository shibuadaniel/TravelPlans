import type { CarRental, Congregation, Flight, Stay } from "@/lib/types";

export function destinationKeyword(destination: string) {
  const trimmed = destination.trim();
  if (!trimmed) return "Untitled trip";
  const part = trimmed.split(/[,/-]/)[0]?.trim();
  return part || "Untitled trip";
}

export function displayDestination(destination: string) {
  const trimmed = destination.trim();
  return trimmed || "Untitled trip";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dateParts(value: string | null | undefined) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function dayText(day: number) {
  return String(day).padStart(2, "0");
}

function monthDay(parts: { month: number; day: number }) {
  return `${MONTHS[parts.month - 1]} ${dayText(parts.day)}`;
}

function fullDate(parts: { year: number; month: number; day: number }) {
  return `${monthDay(parts)}, ${parts.year}`;
}

export function formatShortDate(value: string | null | undefined) {
  const parts = dateParts(value);
  if (!parts) return "—";
  const date = new Date(parts.year, parts.month - 1, parts.day);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function travelReturnLabel(travel: string | null, ret: string | null) {
  const start = dateParts(travel);
  const end = dateParts(ret);
  if (!start && !end) return "";
  if (!start || !end || (start.year === end.year && start.month === end.month && start.day === end.day)) {
    return fullDate((start ?? end)!);
  }
  if (start.year !== end.year) return `${fullDate(start)} - ${fullDate(end)}`;
  if (start.month !== end.month) return `${monthDay(start)} - ${monthDay(end)}, ${start.year}`;
  return `${monthDay(start)} - ${dayText(end.day)}, ${start.year}`;
}

function orderedStamp(value: string | null | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec((value ?? "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  const hour = match[4] === undefined ? null : Number(match[4]);
  const minute = match[5] === undefined ? null : Number(match[5]);
  if (hour !== null && (hour > 23 || minute === null || minute > 59)) return null;
  return { year, month, day, hour, minute };
}

export function calendarDayNumber(value: string | null | undefined) {
  const stamp = orderedStamp(value);
  if (!stamp) return null;
  return stamp.year * 10000 + stamp.month * 100 + stamp.day;
}

export function endsBeforeStart(start: string | null | undefined, end: string | null | undefined) {
  const startStamp = orderedStamp(start);
  const endStamp = orderedStamp(end);
  if (!startStamp || !endStamp) return false;
  if (endStamp.year !== startStamp.year) return endStamp.year < startStamp.year;
  if (endStamp.month !== startStamp.month) return endStamp.month < startStamp.month;
  if (endStamp.day !== startStamp.day) return endStamp.day < startStamp.day;
  if (startStamp.hour === null || endStamp.hour === null || startStamp.minute === null || endStamp.minute === null) {
    return false;
  }
  if (endStamp.hour !== startStamp.hour) return endStamp.hour < startStamp.hour;
  return endStamp.minute < startStamp.minute;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function arrowRange(left: string, right: string) {
  if (!left && !right) return "";
  return `${left || "—"} → ${right || "—"}`;
}

export function flightTitle(flight: Flight, index: number) {
  return flight.airline.trim() || `Flight ${index + 1}`;
}

export function carTitle(car: CarRental, index: number) {
  return car.company.trim() || `Rental ${index + 1}`;
}

export function stayTitle(stay: Stay, index: number) {
  return stay.name.trim() || `Stay ${index + 1}`;
}

export function congregationTitle(congregation: Congregation, index: number) {
  return congregation.name.trim() || `Congregation ${index + 1}`;
}

export function pastelGradient(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const hue = Math.abs(hash) % 360;
  const hueTwo = (hue + 28) % 360;
  return `linear-gradient(160deg, hsl(${hue} 62% 82%) 0%, hsl(${hueTwo} 55% 74%) 100%)`;
}

export function safeInternalPath(value: string | undefined, fallback: string, options?: { allowAuth?: boolean }) {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) return fallback;
  if (!options?.allowAuth && trimmed.startsWith("/auth")) return fallback;
  if (trimmed.includes("\\") || trimmed.includes("@") || trimmed.includes("\0")) return fallback;
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return fallback;
  }
  const path = decoded.split("#")[0]?.split("?")[0] ?? "";
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return fallback;
  if (!options?.allowAuth && path.startsWith("/auth")) return fallback;
  if (path.includes("\\") || path.includes("//") || path.split("/").includes("..")) return fallback;
  if (!/^\/[A-Za-z0-9/_\-.]*$/.test(path)) return fallback;
  return path;
}
