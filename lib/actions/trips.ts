"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/current";
import {
  addCollaborator,
  createShare,
  deleteInsuranceDocument,
  deleteTrip,
  getRole,
  insertBlankTrip,
  listShareLinks,
  addGuestEmail,
  listMembers,
  normalizeGuestEmail,
  removeGuestEmail,
  removeCollaborator,
  revokeShare,
  rotateShare,
  saveCars,
  saveCongregations,
  saveFlights,
  saveInsurance,
  saveOverview,
  saveStays,
  type StayWrite,
} from "@/lib/data";
import { storeFile, removeStoredFile } from "@/lib/uploads";
import type {
  CarRental,
  Congregation,
  Flight,
  Insurance,
  InsuranceDocument,
  Member,
  Result,
  ShareLinkInfo,
  Stay,
} from "@/lib/types";

function revalidateTrip(tripId: string) {
  revalidatePath("/");
  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/edit`);
  revalidatePath(`/guest/${tripId}`);
}

async function editor(tripId: string) {
  const user = await getCurrentUser();
  if (!user) return { user: null, role: null };
  return { user, role: await getRole(user.id, tripId) };
}

function localHost(host: string) {
  const name = host.split(":")[0];
  if (name === "localhost" || name.endsWith(".local")) return true;
  if (name.startsWith("127.") || name.startsWith("10.") || name.startsWith("192.168.")) return true;
  const second = Number(name.split(".")[1]);
  return name.startsWith("172.") && second >= 16 && second <= 31;
}

async function origin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return "http://localhost:3000";
  const forwarded = headerList.get("x-forwarded-proto");
  const proto = localHost(host) ? "http" : forwarded ?? "https";
  return `${proto}://${host}`;
}

export async function createBlankTrip(): Promise<Result<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };
  if (!user.onboardedAt) return { ok: false, error: "Finish setup before creating a trip." };
  const id = await insertBlankTrip(user.id);
  revalidatePath("/");
  return { ok: true, data: { id } };
}

export async function saveOverviewAction(
  tripId: string,
  input: { destination: string; travelDate: string | null; returnDate: string | null; notes: string },
): Promise<Result<{ destination: string; travelDate: string | null; returnDate: string | null; notes: string }>> {
  const access = await editor(tripId);
  if (!access.role) return { ok: false, error: "Trip not found." };
  try {
    const saved = await saveOverview(tripId, input);
    revalidateTrip(tripId);
    return { ok: true, data: saved };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save the overview." };
  }
}

export async function saveFlightsAction(tripId: string, flights: Flight[]): Promise<Result<Flight[]>> {
  const access = await editor(tripId);
  if (!access.role) return { ok: false, error: "Trip not found." };
  try {
    const saved = await saveFlights(tripId, flights);
    revalidateTrip(tripId);
    return { ok: true, data: saved };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save flights." };
  }
}

export async function saveCarsAction(tripId: string, cars: CarRental[]): Promise<Result<CarRental[]>> {
  const access = await editor(tripId);
  if (!access.role) return { ok: false, error: "Trip not found." };
  try {
    const saved = await saveCars(tripId, cars);
    revalidateTrip(tripId);
    return { ok: true, data: saved };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save car rentals." };
  }
}

export async function saveStaysAction(tripId: string, formData: FormData): Promise<Result<Stay[]>> {
  const access = await editor(tripId);
  if (!access.role) return { ok: false, error: "Trip not found." };
  const raw = String(formData.get("payload") ?? "[]");
  let parsed: StayWrite[] = [];
  try {
    parsed = JSON.parse(raw) as StayWrite[];
    if (!Array.isArray(parsed)) throw new Error("Invalid stays.");
  } catch {
    return { ok: false, error: "Could not read the stay form." };
  }
  const stored: string[] = [];
  try {
    for (const stay of parsed) {
      const file = formData.get(`file_${stay.id}`);
      if (file instanceof File && file.size > 0) {
        const saved = await storeFile(file);
        stay.file = saved;
        stored.push(saved.key);
      }
    }
    const saved = await saveStays(tripId, parsed);
    revalidateTrip(tripId);
    return { ok: true, data: saved };
  } catch (error) {
    for (const key of stored) removeStoredFile(key);
    return { ok: false, error: error instanceof Error ? error.message : "Could not save stays." };
  }
}

export async function saveInsuranceAction(
  tripId: string,
  formData: FormData,
): Promise<Result<{ insurance: Insurance; documents: InsuranceDocument[] }>> {
  const access = await editor(tripId);
  if (!access.role) return { ok: false, error: "Trip not found." };
  let insurance: Insurance;
  try {
    insurance = JSON.parse(String(formData.get("payload") ?? "")) as Insurance;
  } catch {
    return { ok: false, error: "Could not read the insurance form." };
  }
  const stored: string[] = [];
  try {
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
    const approvals = formData.getAll("approvals").map((value) => String(value) === "1");
    let existing: { id: string; requiresApproval: boolean }[] = [];
    try {
      const parsed = JSON.parse(String(formData.get("documents") ?? "[]")) as { id?: string; requiresApproval?: boolean }[];
      if (Array.isArray(parsed)) {
        existing = parsed.flatMap((item) =>
          typeof item.id === "string" ? [{ id: item.id, requiresApproval: Boolean(item.requiresApproval) }] : [],
        );
      }
    } catch {
      existing = [];
    }
    const savedFiles = [];
    for (const [index, file] of files.entries()) {
      const storedFile = await storeFile(file);
      savedFiles.push({ ...storedFile, requiresApproval: approvals[index] === true });
      stored.push(storedFile.key);
    }
    const saved = await saveInsurance(tripId, insurance, savedFiles, existing);
    revalidateTrip(tripId);
    return { ok: true, data: saved };
  } catch (error) {
    for (const key of stored) removeStoredFile(key);
    return { ok: false, error: error instanceof Error ? error.message : "Could not save insurance." };
  }
}

export async function deleteInsuranceDocumentAction(
  tripId: string,
  documentId: string,
): Promise<Result<InsuranceDocument[]>> {
  const access = await editor(tripId);
  if (!access.role) return { ok: false, error: "Trip not found." };
  try {
    const documents = await deleteInsuranceDocument(tripId, documentId);
    revalidateTrip(tripId);
    return { ok: true, data: documents };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not delete that document." };
  }
}

export async function saveCongregationsAction(
  tripId: string,
  congregations: Congregation[],
): Promise<Result<Congregation[]>> {
  const access = await editor(tripId);
  if (!access.role) return { ok: false, error: "Trip not found." };
  try {
    const saved = await saveCongregations(tripId, congregations);
    revalidateTrip(tripId);
    return { ok: true, data: saved };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save congregations." };
  }
}

export async function deleteTripAction(tripId: string): Promise<Result<{ href: string }>> {
  const access = await editor(tripId);
  if (!access.role) return { ok: false, error: "Trip not found." };
  if (access.role !== "owner") return { ok: false, error: "Only the owner can delete this trip." };
  await deleteTrip(tripId);
  revalidatePath("/");
  return { ok: true, data: { href: "/" } };
}

async function ownerShare(tripId: string) {
  const access = await editor(tripId);
  if (!access.user || !access.role) return { ok: false as const, error: "Trip not found." };
  if (access.role !== "owner") return { ok: false as const, error: "Only the owner can manage sharing." };
  return { ok: true as const, userId: access.user.id };
}

export async function createShareAction(
  tripId: string,
): Promise<Result<{ url: string; links: ShareLinkInfo[] }>> {
  const access = await ownerShare(tripId);
  if (!access.ok) return access;
  const token = await createShare(tripId);
  revalidateTrip(tripId);
  return {
    ok: true,
    data: { url: `${await origin()}/s/${token}`, links: await listShareLinks(tripId) },
  };
}

export async function rotateShareAction(
  tripId: string,
): Promise<Result<{ url: string; links: ShareLinkInfo[] }>> {
  const access = await ownerShare(tripId);
  if (!access.ok) return access;
  const token = await rotateShare(tripId);
  revalidateTrip(tripId);
  return {
    ok: true,
    data: { url: `${await origin()}/s/${token}`, links: await listShareLinks(tripId) },
  };
}

export async function revokeShareAction(tripId: string, linkId: string): Promise<Result<ShareLinkInfo[]>> {
  const access = await ownerShare(tripId);
  if (!access.ok) return access;
  await revokeShare(tripId, linkId);
  revalidateTrip(tripId);
  return { ok: true, data: await listShareLinks(tripId) };
}

export async function addGuestEmailAction(tripId: string, email: string): Promise<Result<string[]>> {
  const access = await ownerShare(tripId);
  if (!access.ok) return access;
  const normalized = normalizeGuestEmail(email);
  if (!normalized) return { ok: false, error: "Enter a valid email address." };
  try {
    const emails = await addGuestEmail(tripId, normalized);
    revalidateTrip(tripId);
    return { ok: true, data: emails };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not add that email." };
  }
}

export async function removeGuestEmailAction(tripId: string, email: string): Promise<Result<string[]>> {
  const access = await ownerShare(tripId);
  if (!access.ok) return access;
  const normalized = normalizeGuestEmail(email);
  if (!normalized) return { ok: false, error: "Enter a valid email address." };
  const emails = await removeGuestEmail(tripId, normalized);
  revalidateTrip(tripId);
  return { ok: true, data: emails };
}

export async function addCollaboratorAction(tripId: string, email: string): Promise<Result<Member[]>> {
  const access = await ownerShare(tripId);
  if (!access.ok) return access;
  try {
    const members = await addCollaborator(tripId, access.userId, email);
    revalidatePath("/");
    return { ok: true, data: members };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not add that person." };
  }
}

export async function removeCollaboratorAction(tripId: string, userId: string): Promise<Result<Member[]>> {
  const access = await ownerShare(tripId);
  if (!access.ok) return access;
  try {
    const members = await removeCollaborator(tripId, userId);
    revalidatePath("/");
    return { ok: true, data: members };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not remove that person." };
  }
}
