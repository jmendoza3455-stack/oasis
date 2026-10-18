import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { ATTRIBUTION_COOKIE, ATTRIBUTION_PARAMS } from "@/lib/attribution-cookie";

// Refresca la sesión de Supabase en cada request (chequeo optimista; la autorización real es RLS).
function withAttribution(request: NextRequest, response: NextResponse) {
  const params = request.nextUrl.searchParams;
  const found = ATTRIBUTION_PARAMS.filter((k) => params.get(k));
  if (found.length === 0) return response;
  const value = Object.fromEntries(found.map((k) => [k, params.get(k)!.slice(0, 300)]));
  response.cookies.set(
    ATTRIBUTION_COOKIE,
    encodeURIComponent(
      JSON.stringify({
        ...value,
        landing_path: request.nextUrl.pathname,
        referrer: request.headers.get("referer")?.slice(0, 500) ?? "",
      }),
    ),
    { path: "/", maxAge: 60 * 60 * 24 * 90, sameSite: "lax" },
  );
  return response;
}

export async function proxy(request: NextRequest) {
  const env = publicEnv();
  if (!env) return withAttribution(request, NextResponse.next({ request }));

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  await supabase.auth.getUser();
  return withAttribution(request, response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|brand/|icon.svg|robots.txt|sitemap.xml).*)"],
};
