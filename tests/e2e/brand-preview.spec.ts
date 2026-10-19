import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { shot } from "./helpers";

// Vista previa de la marca madre (front de F2/F3 con contenido de ejemplo, no publicada).

const axe = async (page: import("@playwright/test").Page) => {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" ")}`)).toEqual([]);
};

test.describe("vista previa de la marca", () => {
  test("portada con buscador, experiencias de ejemplo y locales", async ({ page }, info) => {
    await page.goto("/vista-previa");
    await expect(page.getByText("Vista previa, no publicada.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Celebra en el campo, con todo resuelto",
    );
    await expect(page.getByRole("search", { name: "Buscar locales y experiencias" })).toBeVisible();
    await expect(page.getByText("Ejemplo").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Oasis Pachacámac" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await axe(page);
    await shot(page, info, "marca-portada");
  });

  test("buscar por tipo, fecha e invitados muestra disponibilidad y aforo", async ({
    page,
  }, info) => {
    await page.goto("/vista-previa");
    await page.getByLabel("Tipo de evento").selectOption("bodas");
    await page.getByLabel("Fecha").fill("2027-02-14");
    await page.getByLabel("Invitados").fill("400");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL(/buscar\?tipo=bodas&fecha=2027-02-14&invitados=400/);
    await expect(page.getByText("Bodas · 14/02/2027 · 400 invitados")).toBeVisible();
    await expect(page.getByText("Libre")).toBeVisible();
    await expect(page.getByText("Supera el aforo")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Boda campestre de día" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cumpleaños con piscina" })).toHaveCount(0);
    await axe(page);
    await shot(page, info, "marca-buscar");
  });

  test("experiencia con lo que incluye y galería ampliable", async ({ page }, info) => {
    await page.goto("/vista-previa/experiencias/full-day-de-integracion");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Full day de integración");
    await expect(page.getByText("Proveedor aliado (por definir)").first()).toBeVisible();
    await expect(page.getByText("Por definir con los proveedores")).toBeVisible();
    await axe(page);
    await page.getByRole("button", { name: /Ampliar: piscina/ }).click();
    await expect(page.getByRole("button", { name: "Cerrar" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Cerrar" })).toHaveCount(0);
    await shot(page, info, "marca-experiencia");
  });

  test("local con galería, ficha y antes/después", async ({ page }, info) => {
    await page.goto("/vista-previa/locales/oasis-pachacamac");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Oasis Pachacámac");
    await expect(page.getByText("Hasta 150 invitados")).toBeVisible();
    await expect(page.getByText(/Desliza para comparar/)).toBeVisible();
    await axe(page);
    await shot(page, info, "marca-local");
  });

  test("mi cuenta y pago con montos con IGV de ejemplo", async ({ page }, info) => {
    await page.goto("/vista-previa/mi-cuenta");
    await expect(page.getByRole("list", { name: "Estado de la reserva" })).toBeVisible();
    await expect(page.getByText("Pagado")).toBeVisible();
    await axe(page);
    await shot(page, info, "marca-mi-cuenta");
    await page.getByRole("link", { name: "Pagar saldo" }).click();
    await expect(page.getByText("Total a pagar")).toBeVisible();
    await expect(page.getByText(/S\/\s?3,068\.00/).first()).toBeVisible();
    await expect(page.getByRole("radio", { name: /Yape/ })).toBeVisible();
    await axe(page);
    await shot(page, info, "marca-pagar");
  });
});
