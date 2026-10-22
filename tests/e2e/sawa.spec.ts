import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { shot } from "./helpers";

// Web pública reducida de la marca SAWA (OASIS.md §15.15): sin experiencias de ejemplo, sin
// cuentas ni pagos y sin fotos provisionales.

const axe = async (page: import("@playwright/test").Page) => {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" ")}`)).toEqual([]);
};

test.describe("web SAWA", () => {
  test("portada pública sin contenido de ejemplo", async ({ page }, info) => {
    await page.goto("/sawa");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Celebra en el campo, con todo resuelto",
    );
    await expect(page.getByText("Vista previa, no publicada.")).toHaveCount(0);
    await expect(page.getByText("Ejemplo")).toHaveCount(0);
    await expect(page.getByText(/FOTO PENDIENTE/)).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Mi cuenta/ })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Oasis Pachacámac" })).toBeVisible();
    await axe(page);
    await shot(page, info, "sawa-portada");
  });

  test("buscar muestra disponibilidad en vivo y aforo", async ({ page }, info) => {
    await page.goto("/sawa");
    await page.getByLabel("Tipo de evento").selectOption("corporativo");
    await page.getByLabel("Fecha").fill("2027-03-10");
    await page.getByLabel("Invitados").fill("50");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL(/\/sawa\/buscar\?tipo=corporativo&fecha=2027-03-10&invitados=50/);
    await expect(page.getByText("Empresas · 10/03/2027 · 50 invitados")).toBeVisible();
    await expect(page.getByText("Libre")).toBeVisible();
    await axe(page);
    await shot(page, info, "sawa-buscar");
  });

  test("página del local con el sello del manual y enlace al calendario", async ({
    page,
  }, info) => {
    await page.goto("/sawa/locales/oasis-pachacamac");
    await expect(page.getByText("Un espacio").first()).toBeVisible();
    await expect(page.getByText("Hasta 150 invitados")).toBeVisible();
    await page.getByRole("link", { name: "Ver calendario y cotizar" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/sawa/locales/oasis-pachacamac");
    await axe(page);
    await shot(page, info, "sawa-local");
  });
});
