import { NextResponse, type NextRequest } from "next/server";
import { devAuthEnabled, requireStaff } from "@/lib/auth/session";
import { MARKETING_MAX_BYTES, writeLocalFile } from "@/lib/storage";

// Solo local/CI: recibe la subida directa de marketing (en producción va al bucket de Supabase).
export async function PUT(request: NextRequest) {
  if (!devAuthEnabled()) return new NextResponse(null, { status: 404 });
  await requireStaff();
  const key = request.nextUrl.searchParams.get("key") ?? "";
  if (!key.startsWith("marketing/")) return new NextResponse(null, { status: 400 });
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MARKETING_MAX_BYTES) return new NextResponse(null, { status: 413 });
  await writeLocalFile(key, bytes);
  return NextResponse.json({ Key: key });
}
