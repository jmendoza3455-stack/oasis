import type { Metadata } from "next";
import { Suspense } from "react";
import { MemberControls } from "@/components/admin/team";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { withDb } from "@/lib/db";

export const metadata: Metadata = { title: "Equipo" };

type Member = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: "admin" | "ops" | "planner" | null;
  venueIds: string[];
  createdAt: string;
};

async function Team() {
  const admin = await requireAdmin();
  const { members, venues } = await withDb({ kind: "user", userId: admin.id }, async (sql) => ({
    members: await sql<Member>(
      `select p.id, p.email, p.full_name as "fullName", p.role,
              coalesce(array_agg(m.venue_id) filter (where m.venue_id is not null), '{}') as "venueIds",
              to_char(p.created_at at time zone 'America/Lima', 'DD/MM/YYYY') as "createdAt"
         from profiles p left join venue_members m on m.user_id = p.id
        group by p.id order by p.role nulls first, p.email`,
    ),
    venues: await sql<{ id: string; name: string }>(
      `select id, name from venues where is_active order by name`,
    ),
  }));
  const pending = members.filter((m) => m.role === null);
  const staff = members.filter((m) => m.role === "admin" || m.role === "ops");
  const row = (m: Member) => (
    <li key={m.id} className="grid gap-3 py-3 md:grid-cols-[1fr_280px]">
      <div className="min-w-0">
        <p className="truncate font-medium">{m.fullName ?? m.email}</p>
        <p className="text-muted-foreground truncate text-sm">
          {m.email} · desde {m.createdAt}
        </p>
        {m.role === "ops" && m.venueIds.length === 0 && (
          <Badge variant="outline" className="mt-1">
            Sin local asignado
          </Badge>
        )}
      </div>
      <MemberControls
        userId={m.id}
        role={m.role === "planner" ? null : m.role}
        self={m.id === admin.id}
        venues={venues.map((v) => ({ ...v, member: m.venueIds.includes(v.id) }))}
      />
    </li>
  );
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Pendientes de acceso</CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nadie esperando. Quien ingrese por primera vez con Google aparece aquí sin acceso
              hasta que le des un rol.
            </p>
          ) : (
            <ul className="divide-y">{pending.map(row)}</ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Equipo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <p className="text-muted-foreground text-sm">
            Los admin ven y deciden en todos los locales. Operaciones solo ve los locales que
            marques. Las planners se gestionan en Planners.
          </p>
          <ul className="divide-y">{staff.map(row)}</ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TeamPage() {
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">Equipo</h1>
      <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-xl" />}>
        <Team />
      </Suspense>
    </div>
  );
}
