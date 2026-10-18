import { expect, test } from "@playwright/test";
import { db, loginAs, shot } from "./helpers";

test("CRM: tablero por etapas con canal y campaña", async ({ page }, info) => {
  await loginAs(page, "admin@demo.oasis.test");
  await page.goto("/admin/crm");
  for (const stage of ["Nuevo", "Contactado", "Cotizado", "Pre-reserva", "Perdido"]) {
    await expect(page.getByRole("listitem", { name: stage })).toBeVisible();
  }
  await expect(page.getByText("fd-verano-meta").first()).toBeVisible();
  await shot(page, info, "admin-crm");
  await page.getByRole("navigation", { name: "Filtros" }).getByRole("link", { name: "Planner", exact: true }).click();
  await expect(page).toHaveURL(/canal=planner/);
});

test.describe("CRM · flujo (serial, solo desktop)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(({ isMobile }) => isMobile, "Muta datos");

  test("primera respuesta, pérdida con motivo obligatorio", async ({ page }) => {
    const [lead] = await db<{ id: string }>(
      `select l.id from leads l where l.stage = 'new' order by created_at limit 1`,
    );
    await loginAs(page, "ops@demo.oasis.test");
    await page.goto(`/admin/crm/${lead.id}`);
    await page.getByLabel("Notas").fill("Le escribí por WhatsApp con la cotización (E2E)");
    await page.getByRole("button", { name: "Registrar actividad" }).click();
    await expect(page.getByText("Le escribí por WhatsApp con la cotización (E2E)")).toBeVisible();
    const [after] = await db<{ stage: string; answered: boolean }>(
      `select stage, first_response_at is not null as answered from leads where id = $1`,
      [lead.id],
    );
    expect(after).toEqual({ stage: "contacted", answered: true });

    await page.getByLabel("Etapa").selectOption("lost");
    const move = page.getByRole("button", { name: "Mover" });
    await expect(move).toBeDisabled();
    await page.getByLabel("Motivo de pérdida").fill("Eligió otro local (E2E)");
    await move.click();
    await expect(page.getByText("Motivo de pérdida: Eligió otro local (E2E)")).toBeVisible();
  });

  test("crear pre-reserva desde el lead con precio del tarifario", async ({ page }) => {
    const [lead] = await db<{ id: string }>(
      `select l.id from leads l where l.stage in ('new','contacted','quoted') and not exists (select 1 from bookings b where b.lead_id = l.id)
        order by created_at desc limit 1`,
    );
    await loginAs(page, "ops@demo.oasis.test");
    await page.goto(`/admin/crm/${lead.id}`);
    await page.getByLabel("Fecha", { exact: true }).fill("2027-06-12"); // sábado, temporada baja
    await page.getByLabel("Invitados", { exact: true }).fill("90");
    await page.locator("#b-type").selectOption("wedding");
    await page.getByRole("button", { name: "Crear pre-reserva" }).click();
    await expect(page).toHaveURL(/\/admin\/reservas\//);
    await expect(page.getByText(/S\/\s?4,500\.00/).first()).toBeVisible();
    const [l] = await db<{ stage: string }>(`select stage from leads where id = $1`, [lead.id]);
    expect(l.stage).toBe("prebooked");
  });
});
