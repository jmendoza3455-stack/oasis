import type { Metadata } from "next";
import { Suspense } from "react";
import { LogoHorizontal } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { devAuthEnabled } from "@/lib/auth/session";
import { withDb } from "@/lib/db";
import { devSignIn, signInWithGoogle } from "./actions";
import { LoginForms } from "./login-forms";

export const metadata: Metadata = { title: "Ingresar", robots: { index: false } };

const ERRORS: Record<string, string> = {
  sin_acceso: "Tu usuario no tiene acceso. Pide una invitación al administrador.",
  sin_local:
    "Tu usuario todavía no tiene un local asignado. Pide al administrador que te asigne uno.",
  enlace: "El enlace venció o ya se usó. Pide uno nuevo.",
  google: "No pudimos conectar con Google. Intenta de nuevo o ingresa con tu correo.",
};

/** Logo "G" de Google (uso permitido en botones de inicio de sesión con Google). */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-4">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

const ROLE_LABEL = { admin: "Admin", ops: "Operaciones", planner: "Planner" } as const;

async function DevUsers() {
  const users = await withDb({ kind: "service" }, (sql) =>
    sql<{ id: string; email: string; role: keyof typeof ROLE_LABEL }>(
      `select id, email, role from profiles where role is not null order by role, email limit 20`,
    ),
  );
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">Modo desarrollo</CardTitle>
        <CardDescription>
          Ingresa como un usuario de prueba (no existe en producción).
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {users.map((u) => (
          <form key={u.id} action={devSignIn}>
            <input type="hidden" name="userId" value={u.id} />
            <Button type="submit" variant="outline" className="w-full justify-between">
              <span>{u.email}</span>
              <span className="text-muted-foreground">{ROLE_LABEL[u.role]}</span>
            </Button>
          </form>
        ))}
      </CardContent>
    </Card>
  );
}

async function ErrorNotice({
  searchParams,
}: {
  searchParams: PageProps<"/ingresar">["searchParams"];
}) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;
  return message ? (
    <p role="alert" className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
      {message}
    </p>
  ) : null;
}

export default function LoginPage(props: PageProps<"/ingresar">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12">
      <LogoHorizontal className="self-center" />
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Ingresar</CardTitle>
          <CardDescription>Acceso para el equipo y planners aliados.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Suspense>
            <ErrorNotice searchParams={props.searchParams} />
          </Suspense>
          {process.env.NEXT_PUBLIC_AUTH_GOOGLE === "1" && (
            <>
              <form action={signInWithGoogle}>
                <Button type="submit" variant="outline" className="w-full gap-2">
                  <GoogleMark /> Continuar con Google
                </Button>
              </form>
              <p className="text-muted-foreground flex items-center gap-3 text-xs before:h-px before:flex-1 before:bg-current/20 after:h-px after:flex-1 after:bg-current/20">
                o con tu correo
              </p>
            </>
          )}
          <LoginForms />
        </CardContent>
      </Card>
      {devAuthEnabled() && (
        <Suspense fallback={null}>
          <DevUsers />
        </Suspense>
      )}
    </main>
  );
}
