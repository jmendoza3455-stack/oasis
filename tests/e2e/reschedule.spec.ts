import { expect, test } from "@playwright/test";
import { db, loginAs, shot } from "./helpers";

test.describe("reprogramación (serial, solo desktop)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(({ isMobile }) => isMobile, "Muta datos");

  test("operaciones reprograma una vez; la segunda requiere al admin", async ({ page }, info) => {
    // Reserva Separada propia: pre-reserva + adelanto validado + transición
    const [b] = await db<{ id: string }>(
      `with c as (insert into clients (full_name, phone) values ('Reprogramación E2E', '966555444') returning id)
       insert into bookings (venue_id, client_id, channel, event_type, event_date, guests, rental_list_net)
       select v.id, c.id, 'direct', 'wedding', '2031-05-10', 100, 4500 from venues v, c returning id`,
    );
    await db(
      `insert into payments (booking_id, kind, amount, method, status)
       select id, 'deposit', deposit_amount, 'transfer', 'validated' from bookings where id = $1`,
      [b.id],
    );
    // La transición la hace el admin (transition_booking valida el rol)
    await db(
      `select set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub',
         (select id from auth.users where email = 'admin@demo.oasis.test'))::text, true);
       select public.transition_booking('${b.id}', 'reserved');`,
    );

    await loginAs(page, "ops@demo.oasis.test");
    await page.goto(`/admin/reservas/${b.id}`);
    const form = page.getByRole("form", { name: "Reprogramar" });
    await form.getByLabel("Nueva fecha").fill("2031-05-17");
    await form.getByLabel("Motivo").fill("El cliente cambió la fecha de la boda civil");
    await form.getByRole("button", { name: "Reprogramar" }).click();
    await expect(form.getByRole("status")).toContainText("Reserva reprogramada");
    const [r] = await db<{ date: string; due: string; count: number }>(
      `select to_char(event_date, 'YYYY-MM-DD') as date, to_char(balance_due_on, 'YYYY-MM-DD') as due,
              reschedule_count as count from bookings where id = $1`,
      [b.id],
    );
    expect(r).toEqual({ date: "2031-05-17", due: "2031-05-02", count: 1 });
    await expect(page.getByText(/Reprogramada del 10\/05\/2031 al 17\/05\/2031/)).toBeVisible();
    await shot(page, info, "admin-reprogramar");

    await form.getByLabel("Nueva fecha").fill("2031-05-24");
    await form.getByLabel("Motivo").fill("Otro cambio");
    await form.getByRole("button", { name: "Reprogramar" }).click();
    await expect(form.getByRole("status")).toContainText("solo el admin puede autorizar otra");
  });
});
