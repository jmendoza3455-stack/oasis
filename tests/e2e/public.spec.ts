import { expect, test } from "@playwright/test";
import { db, shot } from "./helpers";

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

  test("consulta de disponibilidad: libre y ocupada", async ({ page }) => {
    await page.goto("/");
    const input = page.getByLabel("¿Qué fecha tienes en mente?");
    // Otros tests mutan reservas en paralelo: se re-consulta la fecha ocupada en cada intento
    await expect(async () => {
      const [taken] = await db<{ d: string }>(
        `select to_char(event_date, 'YYYY-MM-DD') as d from bookings where status in ('reserved','confirmed') order by event_date desc limit 1`,
      );
      await input.fill(taken.d);
      await page.getByRole("button", { name: "Consultar", exact: true }).click();
      await expect(page.getByText(/no está disponible/)).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20_000 });
    await input.fill("2030-03-12");
    await page.getByRole("button", { name: "Consultar", exact: true }).click();
    await expect(page.getByText(/12\/03\/2030 está disponible/)).toBeVisible();
  });

  test("cotizador muestra un rango con IGV", async ({ page }, info) => {
    await page.goto("/full-day");
    await page.getByLabel("Tipo de evento").first().selectOption("family_day");
    await page.getByLabel("Fecha", { exact: true }).fill("2027-01-17");
    await page.getByLabel("Invitados", { exact: true }).first().fill("40");
    await page.getByRole("button", { name: "Ver rango estimado" }).click();
    await expect(page.getByText(/S\/\s?2,950\.00 – S\/\s?3,650\.00/)).toBeVisible();
    await shot(page, info, "full-day");
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
