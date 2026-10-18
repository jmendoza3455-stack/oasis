import type { Metadata } from "next";
import { Suspense } from "react";
import {
  ApplicationActions,
  InvitePlannerForm,
  PlannerStatusToggle,
} from "@/components/admin/planner-admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/session";
import { withDb } from "@/lib/db";
import { formatPEN } from "@/lib/domain";

export const metadata: Metadata = { title: "Planners" };

const STATUS = { invited: "Invitado", active: "Activo", suspended: "Suspendido" } as Record<
  string,
  string
>;

async function Planners() {
  const user = await requireStaff();
  const isAdmin = user.role === "admin";
  const { planners, applications } = await withDb(
    { kind: "user", userId: user.id },
    async (sql) => ({
      planners: await sql<{
        id: string;
        businessName: string;
        contactName: string;
        email: string;
        phone: string | null;
        status: string;
        agreement: boolean;
        bookings: number;
        pending: number;
      }>(
        `select p.id, p.business_name as "businessName", p.contact_name as "contactName", p.email, p.phone, p.status,
              exists (select 1 from planner_agreements a where a.planner_id = p.id) as agreement,
              (select count(*)::int from bookings b where b.planner_id = p.id and b.status in ('reserved','confirmed','done','settled')) as bookings,
              coalesce((select sum(amount)::float8 from commissions c where c.planner_id = p.id and c.status <> 'paid'), 0) as pending
         from planners p order by p.business_name`,
      ),
      applications: await sql<{
        id: string;
        businessName: string;
        contactName: string;
        email: string;
        phone: string;
        instagram: string | null;
        eventsPerYear: number | null;
        message: string | null;
      }>(
        `select id, business_name as "businessName", contact_name as "contactName", email, phone, instagram,
              events_per_year as "eventsPerYear", message
         from planner_applications where status = 'new' order by created_at`,
      ),
    }),
  );
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Planners ({planners.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-left text-xs">
              <tr>
                <th className="p-2">Planner</th>
                <th className="p-2">Estado</th>
                <th className="p-2 text-right">Eventos vendidos</th>
                <th className="p-2 text-right">Comisión pendiente</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {planners.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2">
                    <strong>{p.businessName}</strong>
                    <span className="text-muted-foreground block text-xs">
                      {p.contactName} · {p.email}
                    </span>
                  </td>
                  <td className="p-2">
                    <Badge variant={p.status === "active" ? "default" : "outline"}>
                      {STATUS[p.status]}
                    </Badge>
                    {!p.agreement && (
                      <span className="text-muted-foreground block text-xs">
                        Contrato marco pendiente
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-right">{p.bookings}</td>
                  <td className="p-2 text-right">{formatPEN(p.pending)}</td>
                  <td className="p-2 text-right">
                    {isAdmin && <PlannerStatusToggle id={p.id} status={p.status} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Solicitudes desde la web ({applications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay solicitudes nuevas.</p>
          ) : (
            <ul className="divide-y text-sm">
              {applications.map((a) => (
                <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <span>
                    <strong>{a.businessName}</strong> · {a.contactName}
                    <span className="text-muted-foreground block">
                      {a.email} · {a.phone}
                      {a.instagram && ` · ${a.instagram}`}
                      {a.eventsPerYear !== null && ` · ${a.eventsPerYear} eventos/año`}
                    </span>
                    {a.message && <span className="block">{a.message}</span>}
                  </span>
                  {isAdmin && (
                    <ApplicationActions
                      id={a.id}
                      businessName={a.businessName}
                      contactName={a.contactName}
                      email={a.email}
                      phone={a.phone}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Invitar planner</CardTitle>
            <p className="text-muted-foreground text-sm">
              Recibe un correo para crear su acceso; en su primer ingreso acepta el contrato marco.
            </p>
          </CardHeader>
          <CardContent>
            <InvitePlannerForm />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function PlannersAdminPage() {
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">Planners</h1>
      <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-xl" />}>
        <Planners />
      </Suspense>
    </div>
  );
}
