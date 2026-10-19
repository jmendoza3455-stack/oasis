import { expect, test } from "@playwright/test";
import { db, loginAs, shot } from "./helpers";

test.describe("promociones (serial, solo desktop)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(({ isMobile }) => isMobile, "Muta datos");

  test("el admin crea una promo L-J y se aplica en el cotizador y en la pre-reserva", async ({
    page,
  }, info) => {
    await loginAs(page, "admin@demo.oasis.test");
    await page.goto("/admin/promociones");
    const form = page.getByRole("form", { name: "Nueva promoción" });
    await form.getByLabel("Nombre").fill("Corporativo L-J E2E");
    await form.getByLabel("Desde").fill("2027-06-01");
    await form.getByLabel("Hasta").fill("2027-06-30");
    await form.getByLabel(/Descuento %/).fill("10");
    await form.getByLabel("Corporativo").check();
    await form.getByLabel("Lunes a jueves").check();
    await form.getByRole("button", { name: "Crear promoción" }).click();
    await expect(form.getByRole("status")).toContainText("Promoción creada");
    await shot(page, info, "admin-promociones");

    // Cotizador público: martes 08/06/2027, corporativo
    await page.context().clearCookies();
    await page.goto("/corporativo");
    await page.getByLabel("Tipo de evento").first().selectOption("corporate");
    await page.getByLabel("Fecha", { exact: true }).fill("2027-06-08");
    await page.getByLabel("Invitados", { exact: true }).first().fill("60");
    await page.getByRole("button", { name: "Ver rango estimado" }).click();
    await expect(
      page.getByText("Incluye la promoción «Corporativo L-J E2E» (−10 %)"),
    ).toBeVisible();

    // Pre-reserva desde el CRM en esa fecha: lleva el descuento y la promoción
    const [lead] = await db<{ id: string }>(
      `with c as (insert into clients (full_name, phone) values ('Empresa Promo E2E', '933222111') returning id)
       insert into leads (venue_id, client_id, channel, event_type) select v.id, c.id, 'direct', 'corporate' from venues v, c
       returning id`,
    );
    await loginAs(page, "ops@demo.oasis.test");
    await page.goto(`/admin/crm/${lead.id}`);
    await page.getByLabel("Fecha", { exact: true }).fill("2027-06-08");
    await page.getByLabel("Invitados", { exact: true }).fill("60");
    await page.locator("#b-type").selectOption("corporate");
    await page.getByRole("button", { name: "Crear pre-reserva" }).click();
    await expect(page).toHaveURL(/\/admin\/reservas\//);
    const [b] = await db<{ discount: string; promo: string; net: string; list: string }>(
      `select b.discount_pct::text as discount, p.name as promo, b.rental_net::text as net, b.rental_list_net::text as list
         from bookings b join promotions p on p.id = b.promotion_id where b.lead_id = $1`,
      [lead.id],
    );
    expect(b.discount).toBe("10.00");
    expect(b.promo).toBe("Corporativo L-J E2E");
    expect(Number(b.net)).toBeCloseTo(Number(b.list) * 0.9, 2);
  });

  test("operaciones ve las promociones pero no puede crearlas", async ({ page }) => {
    await loginAs(page, "ops@demo.oasis.test");
    await page.goto("/admin/promociones");
    await expect(page.getByText("Corporativo L-J E2E")).toBeVisible();
    await expect(page.getByRole("form", { name: "Nueva promoción" })).toHaveCount(0);
  });
});
