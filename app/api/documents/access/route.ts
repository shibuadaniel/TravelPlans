import { NextResponse } from "next/server";
import { approvalRequired } from "@/lib/document-access";
import { canReadTrip, readGuestSession } from "@/lib/current";
import { documentOpenState, getInsuranceFile, getStayFile, requestDocumentOpen, type DocumentKind } from "@/lib/data";

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function kindOf(value: unknown): DocumentKind | null {
  return value === "stay" || value === "insurance" ? value : null;
}

async function readableFile(kind: DocumentKind, id: string) {
  if (!idPattern.test(id)) return null;
  const file = kind === "stay" ? await getStayFile(id) : await getInsuranceFile(id);
  if (!file || !(await canReadTrip(file.trip_id))) return null;
  return file;
}

export async function POST(request: Request) {
  let body: { kind?: unknown; id?: unknown };
  try {
    body = (await request.json()) as { kind?: unknown; id?: unknown };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const kind = kindOf(body.kind);
  const id = typeof body.id === "string" ? body.id : "";
  if (!kind || !id) return NextResponse.json({ ok: false }, { status: 400 });
  const file = await readableFile(kind, id);
  if (!file) return NextResponse.json({ ok: false }, { status: 404 });
  if (!approvalRequired(file.requires_approval)) {
    return NextResponse.json({ ok: true, status: "open" });
  }
  const guest = await readGuestSession();
  const opened = await requestDocumentOpen(
    kind,
    id,
    file.trip_id,
    file.document_name,
    guest?.tripId === file.trip_id ? guest.email : null,
  );
  return NextResponse.json({ ok: true, status: opened.status, requestId: opened.id });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = kindOf(url.searchParams.get("kind"));
  const id = url.searchParams.get("id") ?? "";
  const requestId = url.searchParams.get("request") ?? "";
  if (!kind || !idPattern.test(id) || !idPattern.test(requestId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const file = await readableFile(kind, id);
  if (!file) return NextResponse.json({ ok: false }, { status: 404 });
  const status = await documentOpenState(requestId, kind, id);
  return NextResponse.json({ ok: true, status: status ?? "denied" });
}
