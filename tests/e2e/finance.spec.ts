import { expect, test } from "@playwright/test";
import { db, loginAs, shot } from "./helpers";

test.describe("finanzas, importaciones y exportes (serial, solo desktop)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(({ isMobile }) => isMobile, "Muta datos");

  test("importa inversión desde un CSV de Meta y calcula CAC por campaña", async ({
    page,
  }, info) => {
    await loginAs(page, "admin@demo.oasis.test");
    await page.goto("/admin/finanzas");
    const csv =
      "Nombre de la campaña,Inicio del informe,Importe gastado (PEN),Impresiones,Clics en el enlace\n" +
      "bodas-e2e,2026-11-01,350.00,12000,300\nbodas-e2e,2026-11-20,150.00,5000,90\n";
    const form = page.getByRole("form", { name: "Importar inversión CSV" });
    await form
      .getByLabel("Archivo CSV exportado")
      .setInputFiles({ name: "meta.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await form.getByRole("button", { name: "Importar" }).click();
    await expect(page.getByText("Se importaron 1 registros de inversión.")).toBeVisible();
    const [s] = await db<{ amount: string; clicks: number }>(
      `select s.amount::text, s.clicks from campaign_spend s join campaigns c on c.id = s.campaign_id where c.utm_campaign = 'bodas-e2e'`,
    );
    expect(s).toEqual({ amount: "500.00", clicks: 390 });
    await expect(page.getByRole("cell", { name: "bodas-e2e", exact: true }).first()).toBeVisible();
    await shot(page, info, "admin-finanzas");
  });

  test("importa eventos históricos válidos y reporta filas con error", async ({ page }) => {
    await loginAs(page, "admin@demo.oasis.test");
    await page.goto("/admin/finanzas");
    const csv =
      "fecha,tipo,invitados,canal,monto_sin_igv,cliente,telefono,correo\n" +
      "14/03/2026,boda,110,referido,4200,Histórico E2E,988777666,\n" +
      "14/03/2031,boda,110,directo,4200,Futuro E2E,,\n";
    const form = page.getByRole("form", { name: "Importar eventos históricos" });
    await form
      .getByLabel("CSV de eventos realizados")
      .setInputFiles({ name: "hist.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await form.getByRole("button", { name: "Importar histórico" }).click();
    await expect(page.getByText("Se importaron 1 eventos.")).toBeVisible();
    await expect(page.getByText(/Fila 3: la fecha debe ser pasada/)).toBeVisible();
    const [b] = await db<{ status: string; gross: string }>(
      `select b.status, b.rental_gross::text as gross from bookings b join clients c on c.id = b.client_id where c.full_name = 'Histórico E2E'`,
    );
    expect(b).toEqual({ status: "done", gross: "4956.00" });
  });

  test("exporta reservas en CSV y Excel", async ({ page, request }) => {
    await loginAs(page, "ops@demo.oasis.test");
    const cookie = (await page.context().cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
    const csv = await request.get("/admin/exportar/reservas", { headers: { cookie } });
    expect(csv.headers()["content-type"]).toContain("text/csv");
    const text = await csv.text();
    expect(text).toContain("Total con IGV");
    const xlsx = await request.get("/admin/exportar/comisiones?format=xlsx", {
      headers: { cookie },
    });
    expect(xlsx.headers()["content-type"]).toContain("spreadsheetml");
    expect((await xlsx.body()).subarray(0, 2).toString()).toBe("PK");
  });
});
