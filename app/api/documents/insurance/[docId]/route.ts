import { NextResponse } from "next/server";
import { getCurrentUser, guestCanRead } from "@/lib/current";
import { getInsuranceFile, getRole } from "@/lib/data";
import { openDocumentForReader } from "@/lib/document-access";

export async function GET(request: Request, context: { params: Promise<{ docId: string }> }) {
  const { docId } = await context.params;
  const file = await getInsuranceFile(docId);
  if (!file) return new NextResponse("Not found", { status: 404 });
  const user = await getCurrentUser();
  const member = Boolean(user && (await getRole(user.id, file.trip_id)));
  if (!member && !(await guestCanRead(file.trip_id))) {
    const status = user ? 403 : 401;
    return new NextResponse(status === 401 ? "Unauthorized" : "Forbidden", { status });
  }
  return openDocumentForReader(request, file, "insurance", docId, member);
}
