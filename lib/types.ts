export type Role = "owner" | "collaborator";

export type User = {
  id: string;
  email: string;
  name: string;
  onboardedAt: string | null;
};

export type Trip = {
  id: string;
  destination: string;
  travelDate: string | null;
  returnDate: string | null;
  notes: string;
  role: Role;
};

export type PlacePhoto = {
  url: string;
  credit: string;
  creditUrl: string;
};

export type TripListItem = {
  id: string;
  destination: string;
  travelDate: string | null;
  returnDate: string | null;
  role: Role;
  photo: PlacePhoto | null;
};

export type Flight = {
  id: string;
  airline: string;
  flightNumber: string;
  fromAirport: string;
  toAirport: string;
  departAt: string | null;
  arriveAt: string | null;
  confirmation: string;
  passengers: string;
  terminalGate: string;
};

export type CarRental = {
  id: string;
  company: string;
  confirmation: string;
  pickupPlace: string;
  dropoffPlace: string;
  pickupAt: string | null;
  dropoffAt: string | null;
  vehicleClass: string;
  contactPhone: string;
};

export type Stay = {
  id: string;
  name: string;
  address: string;
  checkIn: string | null;
  checkOut: string | null;
  documentName: string | null;
  documentMime: string | null;
  documentSize: number | null;
};

export type Congregation = {
  id: string;
  name: string;
  address: string;
  meetingTimes: string;
  jwOrgUrl: string;
  notes: string;
};

export type Insurance = {
  provider: string;
  policyNumber: string;
  phone: string;
  coverageStart: string | null;
  coverageEnd: string | null;
  claimNotes: string;
};

export type InsuranceDocument = {
  id: string;
  documentName: string;
  documentMime: string;
  documentSize: number;
};

export type TripBundle = {
  trip: Trip;
  flights: Flight[];
  carRentals: CarRental[];
  stays: Stay[];
  congregations: Congregation[];
  insurance: Insurance;
  insuranceDocuments: InsuranceDocument[];
};

export type ShareLinkInfo = {
  id: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type Member = {
  userId: string;
  name: string;
  email: string;
  role: Role;
};

export type CongregationSuggestion = {
  id: string;
  name: string;
  address: string;
  jwOrgUrl: string;
};

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export const EDIT_STEPS = [
  "overview",
  "flights",
  "cars",
  "stays",
  "insurance",
  "congregations",
  "share",
] as const;

export type EditStep = (typeof EDIT_STEPS)[number];
