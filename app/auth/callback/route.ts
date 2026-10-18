import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Destino del enlace mágico de Supabase (PKCE): canjea el código por la sesión.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/ingresar/continuar", request.url));
  }
  return NextResponse.redirect(new URL("/ingresar?error=enlace", request.url));
}
