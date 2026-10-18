import type { Metadata } from "next";
import { Suspense } from "react";
import { LogoHorizontal } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { devAuthEnabled } from "@/lib/auth/session";
import { withDb } from "@/lib/db";
import { devSignIn } from "./actions";
import { LoginForms } from "./login-forms";

export const metadata: Metadata = { title: "Ingresar", robots: { index: false } };

const ERRORS: Record<string, string> = {
  sin_acceso: "Tu usuario no tiene acceso. Pide una invitación al administrador.",
  enlace: "El enlace venció o ya se usó. Pide uno nuevo.",
};

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
