import type { CarRental, Congregation, Flight, Insurance, Stay } from "@/lib/types";

export function newId() {
  return crypto.randomUUID();
}

export function blankFlight(): Flight {
  return {
    id: newId(),
    airline: "",
    flightNumber: "",
    fromAirport: "",
    toAirport: "",
    departAt: null,
    arriveAt: null,
    confirmation: "",
    passengers: "",
    terminalGate: "",
  };
}

export function blankCar(): CarRental {
  return {
    id: newId(),
    company: "",
    confirmation: "",
    pickupPlace: "",
    dropoffPlace: "",
    pickupAt: null,
    dropoffAt: null,
    vehicleClass: "",
    contactPhone: "",
  };
}

export function blankStay(): Stay {
  return {
    id: newId(),
    name: "",
    address: "",
    checkIn: null,
    checkOut: null,
    documentName: null,
    documentMime: null,
    documentSize: null,
    requiresApproval: false,
  };
}

export function blankCongregation(): Congregation {
  return {
    id: newId(),
    name: "",
    address: "",
    meetingTimes: "",
    jwOrgUrl: "",
    notes: "",
  };
}

export function blankInsurance(): Insurance {
  return {
    provider: "",
    policyNumber: "",
    phone: "",
    coverageStart: null,
    coverageEnd: null,
    claimNotes: "",
  };
}
