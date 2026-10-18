import { expect, test } from "@playwright/test";
import { db, loginAs, shot } from "./helpers";

test.describe("operación del evento y NPS (serial, solo desktop)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(({ isMobile }) => isMobile, "Muta datos");

  let doneId: string;
  test.beforeAll(async () => {
    const [b] = await db<{ id: string }>(
      `select id from bookings where status = 'done' order by event_date desc limit 1`,
    );
    doneId = b.id;
  });

  test("checklist D-1 se cierra solo con todo marcado; costos estándar vs real", async ({
    page,
  }, info) => {
    await loginAs(page, "ops@demo.oasis.test");
    await page.goto(`/admin/reservas/${doneId}/operacion`);
    const d1 = page.getByRole("group", { name: "Checklist D-1" });
    const close = d1.getByRole("button", { name: /Cerrar/ });
    await expect(close).toBeDisabled();
    for (const box of await d1.getByRole("checkbox").all()) await box.check();
    await close.click();
    await expect(d1.getByText("· cerrado")).toBeVisible();

    await expect(page.getByLabel("Costo estándar Limpieza")).toHaveValue("250");
    await page.getByLabel("Costo real Limpieza").fill("280");
    await page.getByRole("button", { name: "Guardar costos" }).click();
    await expect(page.getByText("Costos guardados")).toBeVisible();
    const [c] = await db<{ s: string; a: string }>(
      `select standard_amount::text as s, actual_amount::text as a from event_costs where booking_id = $1 and category = 'cleaning'`,
      [doneId],
    );
    expect(c).toEqual({ s: "250.00", a: "280.00" });
    await shot(page, info, "admin-operacion");
  });

  test("incidencia con cargo a la garantía", async ({ page }) => {
    await loginAs(page, "ops@demo.oasis.test");
    await page.goto(`/admin/reservas/${doneId}/operacion`);
    await page.getByLabel("Incidencia o daño").fill("Silla rota en terraza (E2E)");
    await page.getByLabel("Monto S/").fill("120");
    await page.getByLabel("Cargar a la garantía").check();
    await page.getByRole("button", { name: "Registrar incidencia" }).click();
    await expect(page.getByText("Silla rota en terraza (E2E)")).toBeVisible();
  });

  test("el cliente responde la encuesta NPS con el enlace firmado", async ({ page }) => {
    await loginAs(page, "admin@demo.oasis.test");
    await page.goto(`/admin/reservas/${doneId}/operacion`);
    const link = await page.locator("code").filter({ hasText: "/encuesta/" }).innerText();
    const path = new URL(link).pathname;
    await page.context().clearCookies();
    await page.goto(path);
    await page.getByText("9", { exact: true }).click();
    await page.getByLabel(/podríamos mejorar/).fill("Todo excelente (E2E)");
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByText("¡Gracias por tu opinión!")).toBeVisible();
    const [n] = await db<{ score: number }>(
      `select score from nps_responses where booking_id = $1`,
      [doneId],
    );
    expect(n.score).toBe(9);
    await page.goto(path.replace(/\.[^.]+$/, ".firmafalsa"));
    await expect(page.getByText(/404|no se encontró|not found/i).first()).toBeVisible();
  });
});
