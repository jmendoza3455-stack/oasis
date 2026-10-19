import path from "node:path";
import { expect, test } from "@playwright/test";
import { db, loginAs, shot } from "./helpers";

test("fechas libres listas para compartir con clientes", async ({ page }, info) => {
  await loginAs(page, "usuario.planner1@demo.oasis.test");
  await page.goto("/planners/portal/fechas");
  await expect(page.getByRole("heading", { name: "Fechas libres" })).toBeVisible();
  const text = page.getByLabel("Texto para compartir");
  await expect(text).toContainText("Fechas libres en Oasis Pachacámac");
  await expect(page.getByRole("link", { name: "Compartir por WhatsApp" })).toHaveAttribute(
    "href",
    /^https:\/\/wa\.me\/\?text=/,
  );
  // Ninguna fecha ocupada aparece como libre
  const [taken] = await db<{ d: string }>(
    `select to_char(event_date, 'DD/MM/YYYY') as d from bookings
      where status in ('reserved','confirmed') and event_date between current_date and current_date + 90
      order by event_date limit 1`,
  );
  if (taken) await expect(page.getByText(taken.d, { exact: false })).toHaveCount(0);
  await shot(page, info, "portal-fechas");
});

test.describe("voucher desde el portal (serial, solo desktop)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(({ isMobile }) => isMobile, "Muta datos");

  test("el planner envía el voucher de su reserva y queda pendiente de validación", async ({
    page,
  }) => {
    // Pre-reserva del planner 1 (dueño del cliente) en una fecha libre lejana
    await db(
      `with p as (select planner_id as id from profiles where email = 'usuario.planner1@demo.oasis.test'),
            c as (insert into clients (full_name, phone, created_by_planner_id)
                  select 'Cliente Voucher E2E', '944555666', id from p returning id, created_by_planner_id)
       insert into bookings (venue_id, client_id, planner_id, channel, event_type, event_date, guests, rental_list_net)
       select v.id, c.id, c.created_by_planner_id, 'planner', 'wedding', '2030-05-18', 100, 4500 from venues v, c
       returning id`,
    );
    await loginAs(page, "usuario.planner1@demo.oasis.test");
    await page.goto("/planners/portal/reservas");
    const item = page.getByRole("listitem").filter({ hasText: "Cliente Voucher E2E" });
    await item.getByText("Enviar voucher de pago").click();
    const form = item.getByRole("form", { name: "Enviar voucher" });
    await form.getByLabel("Concepto").selectOption("balance");
    await form.getByLabel("Monto S/").fill("1500");
    await form.getByLabel("Medio").selectOption("yape");
    await form.getByLabel("N.º de operación").fill("YAPE-PLANNER-E2E");
    await form.getByLabel(/Voucher/).setInputFiles(path.join(__dirname, "fixtures/voucher.png"));
    await form.getByRole("button", { name: "Enviar voucher" }).click();
    await expect(item.getByText("Voucher enviado.")).toBeVisible();
    const [p] = await db<{ status: string; amount: string; voucher: boolean; by: string }>(
      `select p.status, p.amount::text, p.voucher_path is not null as voucher, u.email as by
         from payments p join auth.users u on u.id = p.created_by
        where p.operation_code = 'YAPE-PLANNER-E2E'`,
    );
    expect(p).toEqual({
      status: "pending",
      amount: "1500.00",
      voucher: true,
      by: "usuario.planner1@demo.oasis.test",
    });
  });
});
