"use server";

import { flightStatuses } from "@/lib/flight-status";
import type { Flight, FlightStatusChip } from "@/lib/types";

export async function refreshFlightStatuses(flights: Flight[]): Promise<Record<string, FlightStatusChip>> {
  try {
    return await flightStatuses(flights);
  } catch {
    return {};
  }
}
