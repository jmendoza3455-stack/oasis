import { expect, test } from "@playwright/test";
import { dayLabel, db, loginAs, shot } from "./helpers";

test.describe("portal de planners", () => {
  test("sin contrato aceptado, el portal pide aceptarlo primero", async ({ page }, info) => {
    await loginAs(page, "usuario.planner2@demo.oasis.test");
    await expect(page).toHaveURL(/\/planners\/portal\/contrato/);
    await expect(
      page.getByText(/Comisión: 5 % sobre el alquiler del espacio sin IGV/),
    ).toBeVisible();
    await shot(page, info, "portal-contrato");
  });

  test("el planner solo ve sus propias reservas", async ({ page }) => {
    const [own] = await db<{ n: number }>(
      `select count(*)::int as n from bookings b join planners p on p.id = b.planner_id
        where p.email = 'planner1@demo.oasis.test' and not (b.status = 'prebooked' and b.hold_expires_at <= now())`,
    );
    await loginAs(page, "usuario.planner1@demo.oasis.test");
    await page.goto("/planners/portal/reservas");
    await expect(page.getByRole("heading", { name: "Mis reservas" })).toBeVisible();
    await expect(page.locator("main li")).toHaveCount(own.n);
  });

  test("tarifario y ficha técnica", async ({ page }, info) => {
    await loginAs(page, "usuario.planner1@demo.oasis.test");
    await page.goto("/planners/portal/tarifario");
    await expect(page.getByRole("heading", { name: /Boda/ })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Tu comisión" }).first()).toBeVisible();
    await shot(page, info, "portal-tarifario");
    await page.goto("/planners/portal/ficha-tecnica");
    await expect(page.getByRole("heading", { name: "Aforo" })).toBeVisible();
  });
});

test.describe("portal de planners · flujo (serial, solo desktop)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(({ isMobile }) => isMobile, "Muta datos: corre una sola vez");

  test("acepta el contrato marco y queda registrado", async ({ page }) => {
    await loginAs(page, "usuario.planner3@demo.oasis.test");
    await page.getByRole("button", { name: "Acepto el contrato marco" }).click();
    await expect(page).toHaveURL(/\/planners\/portal$/);
    const [a] = await db<{ version: string }>(
      `select a.version from planner_agreements a join planners p on p.id = a.planner_id where p.email = 'planner3@demo.oasis.test'`,
    );
    expect(a.version).toBe("2026-10");
  });

  test("registra un cliente, pre-reserva una fecha y la libera", async ({ page }, info) => {
    await loginAs(page, "usuario.planner3@demo.oasis.test");
    await page.goto("/planners/portal/clientes");
    await page.getByLabel("Nombre del cliente").fill("Familia E2E");
    await page.getByLabel("Celular").fill("955 444 333");
    await page.getByLabel(/Tengo autorización/).check();
    await page.getByRole("button", { name: "Registrar cliente" }).click();
    await expect(page.getByText("Cliente registrado.")).toBeVisible();
    await expect(page.getByText("Familia E2E")).toBeVisible();

    await page.goto("/planners/portal");
    const heading = page.getByRole("heading", { level: 2 }).first();
    for (let i = 0; i < 4; i++) {
      const before = await heading.innerText();
      await page.getByRole("button", { name: "Mes siguiente" }).click();
      await expect(heading).not.toHaveText(before);
    }
    const title = await heading.innerText();
    await page
      .getByRole("cell", { name: `10 de ${title}`, exact: true })
      .click({ position: { x: 30, y: 50 } });
    await expect(page.getByRole("heading", { name: /Pre-reservar/ })).toBeVisible();
    await page.getByLabel("Invitados").fill("45");
    await page.getByRole("button", { name: "Crear pre-reserva" }).click();
    await expect(page.getByText(/Pre-reserva creada/)).toBeVisible();

    await page.goto("/planners/portal/reservas");
    // Acotado a la reserva de este test: el seed puede tener otras pre-reservas del planner
    const item = page.getByRole("listitem").filter({ hasText: "Familia E2E" });
    await expect(item.getByText(/Vence en (71|72) h/)).toBeVisible();
    await shot(page, info, "portal-reservas");
    await item.getByRole("button", { name: "Liberar fecha" }).click();
    await expect(item.getByText(/Vence en/)).toHaveCount(0);
  });
});

test("dayLabel helper", () => {
  expect(dayLabel("2027-02-10")).toBe("10 de febrero de 2027");
});
