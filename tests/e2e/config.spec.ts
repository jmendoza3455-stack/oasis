import { expect, test } from "@playwright/test";
import { db, loginAs, shot } from "./helpers";

test("operaciones ve la configuración en solo lectura", async ({ page }) => {
  await loginAs(page, "ops@demo.oasis.test");
  await page.goto("/admin/configuracion");
  await expect(
    page.getByText("Solo el administrador puede cambiar parámetros y tarifas."),
  ).toBeVisible();
  await expect(page.getByLabel("IGV", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Guardar" })).toHaveCount(0);
});

test.describe("configuración y planners (serial, solo desktop)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(({ isMobile }) => isMobile, "Muta datos");

  test("el admin cambia un parámetro y valida una tarifa", async ({ page }, info) => {
    await loginAs(page, "admin@demo.oasis.test");
    await page.goto("/admin/configuracion");
    const budget = page.getByLabel("Pauta mensual (S/)");
    await budget.fill("1800");
    await budget.locator("xpath=..").getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Guardado").first()).toBeVisible();
    const [s] = await db<{ v: string }>(
      `select value #>> '{}' as v from settings where key = 'monthly_ad_budget'`,
    );
    expect(Number(s.v)).toBe(1800);

    const label = "Boda · Lun–Jue · baja";
    await page.getByLabel(`Precio sin IGV ${label}`).fill("2600");
    await page.getByLabel(`Precio validado ${label}`).check();
    await page
      .getByLabel(`Precio sin IGV ${label}`)
      .locator("xpath=ancestor::tr")
      .getByRole("button", { name: "Guardar" })
      .click();
    await expect(page.getByLabel("Guardado")).toBeVisible();
    const [r] = await db<{ price: string; placeholder: boolean }>(
      `select price_net::text as price, is_placeholder as placeholder from rate_cards where event_type = 'wedding' and day_type = 'mon_thu' and season = 'low'`,
    );
    expect(r).toEqual({ price: "2600.00", placeholder: false });

    await page.getByLabel("Fecha del feriado").fill("2030-05-02");
    await page.getByLabel("Nombre del feriado").fill("Feriado E2E");
    await page.getByRole("button", { name: "Agregar feriado" }).click();
    await expect(page.getByText("02/05/2030 · Feriado E2E")).toBeVisible();
    await shot(page, info, "admin-configuracion");
  });

  test("el admin invita a un planner y este debe aceptar el contrato", async ({ page }) => {
    await loginAs(page, "admin@demo.oasis.test");
    await page.goto("/admin/planners");
    const form = page.getByRole("form", { name: "Invitar planner" });
    await form.getByLabel("Marca o empresa").fill("Bodas E2E SAC");
    await form.getByLabel("Contacto").fill("Ana E2E");
    await form.getByLabel("Correo").fill("ana.e2e@planner.test");
    await form.getByRole("button", { name: "Invitar al portal" }).click();
    await expect(page.getByText(/Planner creado/)).toBeVisible();
    await expect(page.getByText("Bodas E2E SAC")).toBeVisible();

    await loginAs(page, "ana.e2e@planner.test");
    await expect(page).toHaveURL(/\/planners\/portal\/contrato/);
  });
});
