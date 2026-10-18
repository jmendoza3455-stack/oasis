import path from "node:path";
import { expect, test } from "@playwright/test";
import { db, loginAs, pdfText, pen, shot } from "./helpers";

test.describe("pagos, documentos y PDFs (serial, solo desktop)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(({ isMobile }) => isMobile, "Muta datos");

  let bookingId: string;
  let deposit: string;

  test.beforeAll(async () => {
    const [b] = await db<{ id: string; deposit: string }>(
      `select id, deposit_amount::text as deposit from bookings
        where status = 'prebooked' and hold_expires_at > now() and rental_list_net > 0 order by event_date limit 1`,
    );
    bookingId = b.id;
    deposit = b.deposit;
  });

  test("operaciones registra el adelanto con voucher; no puede validarlo", async ({ page }) => {
    await loginAs(page, "ops@demo.oasis.test");
    await page.goto(`/admin/reservas/${bookingId}`);
    const form = page.getByRole("form", { name: "Registrar pago" });
    await form.getByLabel("Monto S/").fill(deposit);
    await form.getByLabel("Medio").selectOption("yape");
    await form.getByLabel("N.º de operación").fill("YAPE-E2E-1");
    await form.getByLabel(/Voucher/).setInputFiles(path.join(__dirname, "fixtures/voucher.png"));
    await form.getByRole("button", { name: "Registrar pago" }).click();
    await expect(page.getByText("(Por validar)")).toBeVisible();
    await expect(page.getByRole("link", { name: "voucher" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Validar" })).toHaveCount(0);
  });

  test("el admin valida el pago y la reserva pasa a Separada", async ({ page }, info) => {
    await loginAs(page, "admin@demo.oasis.test");
    await page.goto(`/admin/reservas/${bookingId}`);
    await page.getByRole("button", { name: "Validar" }).click();
    await expect(page.getByText("(Validado)", { exact: true })).toBeVisible();
    const separar = page.getByRole("button", { name: "Marcar como Separada" });
    await expect(separar).toBeEnabled();
    await separar.click();
    await expect(page.getByText("Separada", { exact: true }).first()).toBeVisible();
    await shot(page, info, "admin-reserva-pagos");
  });

  test("cotización versionada y contrato en PDF con y sin IGV", async ({ page, request }) => {
    await loginAs(page, "admin@demo.oasis.test");
    await page.goto(`/admin/reservas/${bookingId}`);
    await page.getByRole("button", { name: "Generar cotización" }).click();
    await expect(page.getByRole("link", { name: "Cotización v1" })).toBeVisible();
    await page.getByRole("button", { name: "Generar cotización" }).click();
    await expect(page.getByRole("link", { name: "Cotización v2" })).toBeVisible();
    await expect(page.getByText("(reemplazada)")).toBeVisible();

    const cookies = await page.context().cookies();
    const headers = { cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; ") };
    const [q] = await db<{ total_net: string; total_igv: string; total_gross: string }>(
      `select total_net::text, total_igv::text, total_gross::text from quotes where booking_id = $1 and version = 2`,
      [bookingId],
    );
    expect(Number(q.total_net) + Number(q.total_igv)).toBeCloseTo(Number(q.total_gross), 2);
    const [b] = await db<{ net: string; igv: string; gross: string; date: string }>(
      `select rental_net::text as net, rental_igv::text as igv, rental_gross::text as gross,
              to_char(event_date, 'DD/MM/YYYY') as date from bookings where id = $1`,
      [bookingId],
    );

    const texts: string[] = [];
    for (const url of [
      `/admin/reservas/${bookingId}/cotizacion/2`,
      `/admin/reservas/${bookingId}/contrato`,
    ]) {
      const res = await request.get(url, { headers });
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toBe("application/pdf");
      const body = await res.body();
      expect(body.subarray(0, 4).toString()).toBe("%PDF");
      texts.push(await pdfText(body));
    }
    const [quote, contract] = texts;
    // Cotización: montos sin IGV, IGV y total con IGV de la versión 2
    for (const amount of [q.total_net, q.total_igv, q.total_gross])
      expect(quote).toContain(pen(amount));
    expect(quote).toContain(b.date);
    // Contrato: alquiler con y sin IGV y fecha del evento
    for (const amount of [b.net, b.gross]) expect(contract).toContain(pen(amount));
    expect(contract).toContain(b.date);
  });

  test("un PDF no se entrega sin sesión de staff", async ({ request }) => {
    const res = await request.get(`/admin/reservas/${bookingId}/contrato`, { maxRedirects: 0 });
    expect([302, 303, 307]).toContain(res.status());
  });
});
