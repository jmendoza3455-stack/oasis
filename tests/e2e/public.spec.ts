import { expect, test } from "@playwright/test";
import { consultDate, db, openLeadStep, shot } from "./helpers";

test.describe("web pública", () => {
  test("home: propuesta, segmentos y datos estructurados", async ({ page }, info) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      /Casa de campo para celebrar en Pachacámac/,
    );
    await expect(page.getByRole("link", { name: /Bodas/ }).first()).toBeVisible();
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(ld!)["@type"]).toContain("EventVenue");
    await expect(page.getByRole("link", { name: "Libro de Reclamaciones" })).toBeVisible();
    await shot(page, info, "home");
  });

  test("flujo único: fecha ocupada sugiere fechas libres cercanas", async ({ page }) => {
    await page.goto("/");
    // Otros tests mutan reservas en paralelo: se re-consulta la fecha ocupada en cada intento
    await expect(async () => {
      const [taken] = await db<{ d: string }>(
        `select to_char(event_date, 'YYYY-MM-DD') as d from bookings where status in ('reserved','confirmed') order by event_date desc limit 1`,
      );
      await consultDate(page, { date: taken.d });
      await expect(page.getByText(/no está disponible/)).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20_000 });
    await expect(page.getByText("Fechas libres cercanas:")).toBeVisible();
    const alternative = page
      .locator("#cotizar")
      .getByRole("button", { name: /\d{2}\/\d{2}\/\d{4}/ })
      .first();
    await alternative.click();
    await expect(page.getByText(/está libre!/)).toBeVisible();
  });

  test("flujo único: rango con IGV y datos de contacto con la fecha ya cargada", async ({
    page,
  }, info) => {
    await page.goto("/full-day");
    await consultDate(page, { date: "2027-01-17", guests: 40 });
    await expect(page.getByText("¡El domingo 17/01/2027 está libre!")).toBeVisible();
    await expect(page.getByText(/S\/\s?2,950\.00 – S\/\s?3,650\.00/)).toBeVisible();
    await shot(page, info, "full-day");
    await page.getByRole("button", { name: "Separar o cotizar esta fecha" }).click();
    await expect(
      page.getByText("Full day familiar · domingo 17/01/2027 · 40 invitados"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Quiero esta fecha" })).toBeVisible();
  });

  test("datos del local, sin «pendiente» a la vista", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("list", { name: "Datos del local" })).toContainText(
      "Un solo evento por día",
    );
    await expect(page.getByText(/pendiente|\[COMPLETAR/i)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Así de simple es reservar" })).toBeVisible();
  });

  test("precios públicos y página 404 con marca", async ({ page }, info) => {
    await page.goto("/precios");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Precios claros, sin sorpresas",
    );
    await expect(page.getByRole("table").first()).toContainText(/desde S\/\s?[\d,]+\.\d{2}/);
    await shot(page, info, "precios");
    const res = await page.goto("/no-existe");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Esta página no existe" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Consultar mi fecha" })).toBeVisible();
  });
});

test.describe("web pública · formularios (serial, solo desktop)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(({ isMobile }) => isMobile, "Crea datos: corre una sola vez");

  test("un lead con UTM conserva su campaña hasta la BD", async ({ page }) => {
    await page.goto(
      "/bodas?utm_source=facebook&utm_medium=cpc&utm_campaign=bodas-e2e&fbclid=FB123",
    );
    await page.goto("/bodas"); // navegación posterior: la atribución first-touch se mantiene
    await openLeadStep(page);
    await page.getByLabel("Nombre").fill("Novia E2E");
    await page.getByLabel("Celular / WhatsApp").fill("987 654 321");
    await page.getByLabel("Correo").fill("novia.e2e@test.pe");
    await page.getByLabel(/Acepto el/).check();
    await page.getByRole("button", { name: "Solicitar cotización" }).click();
    await expect(page.getByText("¡Gracias! Recibimos tu consulta.")).toBeVisible();
    const [lead] = await db<{
      utm_campaign: string;
      fbclid: string;
      channel: string;
      landing_path: string;
    }>(
      `select utm_campaign, fbclid, channel, landing_path from leads l join clients c on c.id = l.client_id
        where c.email = 'novia.e2e@test.pe'`,
    );
    expect(lead).toEqual({
      utm_campaign: "bodas-e2e",
      fbclid: "FB123",
      channel: "direct",
      landing_path: "/bodas",
    });
  });

  test("un cliente de planner que entra directo respeta al planner", async ({ page }) => {
    const [pc] = await db<{ phone: string; planner: string }>(
      `select c.phone, c.created_by_planner_id as planner from clients c where c.created_by_planner_id is not null limit 1`,
    );
    await page.goto("/");
    await openLeadStep(page);
    await page.getByLabel("Nombre").fill("Duplicado E2E");
    await page.getByLabel("Celular / WhatsApp").fill(`+51 ${pc.phone}`);
    await page.getByLabel("Correo").fill("duplicado.e2e@test.pe");
    await page.getByLabel(/Acepto el/).check();
    await page.getByRole("button", { name: "Solicitar cotización" }).click();
    await expect(page.getByText("¡Gracias! Recibimos tu consulta.")).toBeVisible();
    const [lead] = await db<{ channel: string; planner_id: string; attribution_alert: string }>(
      `select l.channel, l.planner_id, l.attribution_alert from leads l join clients c on c.id = l.client_id
        where c.email = 'duplicado.e2e@test.pe'`,
    );
    expect(lead.channel).toBe("planner");
    expect(lead.planner_id).toBe(pc.planner);
    expect(lead.attribution_alert).toMatch(/match por phone/);
  });

  test("el honeypot descarta bots sin guardar nada", async ({ page }) => {
    await page.goto("/");
    await openLeadStep(page);
    await page.getByLabel("Nombre").fill("Bot");
    await page.getByLabel("Celular / WhatsApp").fill("999999999");
    await page.getByLabel("Correo").fill("bot@spam.test");
    await page.getByLabel(/Acepto el/).check();
    await page
      .locator('input[name="website"]')
      .first()
      .evaluate((el: HTMLInputElement) => (el.value = "spam"));
    await page.getByRole("button", { name: "Solicitar cotización" }).click();
    await expect(page.getByText("¡Gracias! Recibimos tu consulta.")).toBeVisible();
    const rows = await db(`select 1 from clients where email = 'bot@spam.test'`);
    expect(rows).toHaveLength(0);
  });

  test("solicitud de alta de planner", async ({ page }, info) => {
    await page.goto("/planners");
    await page.getByLabel("Marca o empresa").fill("Eventos E2E");
    await page.getByLabel("Tu nombre").fill("Planner E2E");
    await page.getByLabel("Correo").fill("planner.e2e@test.pe");
    await page.getByLabel("Celular / WhatsApp").fill("912345678");
    await page.getByLabel(/Acepto el/).check();
    await page.getByRole("button", { name: "Quiero ser planner aliada" }).click();
    await expect(page.getByText(/Recibimos tu solicitud/)).toBeVisible();
    await shot(page, info, "planners");
  });

  test("Libro de Reclamaciones entrega un código correlativo", async ({ page }) => {
    await page.goto("/libro-de-reclamaciones");
    await page.getByLabel("Nombre completo").fill("Consumidor E2E");
    await page.getByLabel("Número de documento").fill("45678912");
    await page.getByLabel("Domicilio").fill("Av. Siempre Viva 123, Lima");
    await page.getByLabel("Correo").fill("consumidor.e2e@test.pe");
    await page.getByLabel("Servicio").fill("Alquiler del local");
    await page.getByLabel("¿Qué ocurrió?").fill("Prueba automatizada del libro de reclamaciones.");
    await page.getByLabel("¿Qué solicitas?").fill("Respuesta de prueba.");
    await page.getByLabel(/Acepto el/).check();
    await page.getByRole("button", { name: "Registrar hoja de reclamación" }).click();
    await expect(page.getByText(/LR-\d{4}-\d{6}/)).toBeVisible();
  });
});

test("SEO: robots y sitemap", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/bodas");
});
