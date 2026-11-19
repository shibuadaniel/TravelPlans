import { NextResponse } from "next/server";
import { canReadTrip, getCurrentUser, readGuestSession } from "@/lib/current";
import { getStayFile } from "@/lib/data";
import { readStoredFile } from "@/lib/uploads";

export async function GET(_request: Request, context: { params: Promise<{ stayId: string }> }) {
  const { stayId } = await context.params;
  const file = await getStayFile(stayId);
  if (!file) return new NextResponse("Not found", { status: 404 });
  if (!(await canReadTrip(file.trip_id))) {
    const user = await getCurrentUser();
    const guest = await readGuestSession();
    const status = user || guest ? 403 : 401;
    return new NextResponse(status === 401 ? "Unauthorized" : "Forbidden", { status });
  }
  const bytes = await readStoredFile(file.document_key);
  if (!bytes) return new NextResponse("Not found", { status: 404 });
  const filename = file.document_name.replace(/["\r\n]/g, "");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": file.document_mime,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
