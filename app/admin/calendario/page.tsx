import type { Metadata } from "next";
import { Suspense } from "react";
import { MasterCalendar } from "@/components/admin/master-calendar";
import { requireStaff } from "@/lib/auth/session";
import { addDays } from "@/lib/domain";
import { calendarData } from "@/server/queries/calendar";
import { activeVenue } from "@/server/venue";

export const metadata: Metadata = { title: "Calendario" };

async function CalendarSection() {
  const user = await requireStaff();
  const venue = await activeVenue();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: venue.timezone }).format(new Date());
  const { bookings, blocks } = await calendarData(
    user.id,
    venue.id,
    addDays(today, -120),
    addDays(today, 540),
  );
  return <MasterCalendar bookings={bookings} blocks={blocks} today={today} />;
}

export default function CalendarPage() {
  return (
    <div className="grid gap-4">
      <header>
        <h1 className="font-display text-3xl">Calendario maestro</h1>
        <p className="text-muted-foreground text-sm">
          Toca un día (o arrastra sobre varios) para bloquearlo. Toca una reserva para ver su ficha.
        </p>
      </header>
      <Suspense fallback={<div className="bg-muted h-96 animate-pulse rounded-xl" />}>
        <CalendarSection />
      </Suspense>
    </div>
  );
}
