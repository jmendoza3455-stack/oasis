import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser, homeFor } from "@/lib/auth/session";

async function Continue(): Promise<null> {
  const user = await getSessionUser();
  redirect(user ? homeFor(user.role) : "/ingresar");
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted-foreground p-8 text-center">Ingresando…</p>}>
      <Continue />
    </Suspense>
  );
}
