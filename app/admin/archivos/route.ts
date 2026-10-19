import { NextResponse, type NextRequest } from "next/server";
import { devAuthEnabled, requireStaff } from "@/lib/auth/session";
import { ALLOWED_TYPES, MARKETING_TYPES, readLocalFile } from "@/lib/storage";

// Solo local/CI: sirve archivos de .storage/ a usuarios staff.
export async function GET(request: NextRequest) {
  if (!devAuthEnabled()) return new NextResponse(null, { status: 404 });
  await requireStaff();
  const key = request.nextUrl.searchParams.get("key") ?? "";
  const ext = key.split(".").pop() ?? "";
  const type =
    Object.entries({ ...ALLOWED_TYPES, ...MARKETING_TYPES }).find(([, e]) => e === ext)?.[0] ??
    "application/octet-stream";
  try {
    return new NextResponse(new Uint8Array(await readLocalFile(key)), {
      headers: { "Content-Type": type },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
