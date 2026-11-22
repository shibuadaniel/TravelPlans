import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current";
import { decideDocumentOpen, listPendingDocumentOpens } from "@/lib/data";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const requests = await listPendingDocumentOpens(user.id);
  return NextResponse.json({
    ok: true,
    requests: requests.map((request) => ({
      id: request.id,
      documentName: request.documentName,
      tripName: request.tripName,
      requesterEmail: request.requesterEmail,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  let body: { id?: string; decision?: string };
  try {
    body = (await request.json()) as { id?: string; decision?: string };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body.id || (body.decision !== "approved" && body.decision !== "denied")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const saved = await decideDocumentOpen(user.id, body.id, body.decision);
  if (!saved) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true });
}
