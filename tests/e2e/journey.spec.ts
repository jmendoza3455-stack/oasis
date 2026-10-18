import path from "node:path";
import { expect, test } from "@playwright/test";
import { db, loginAs } from "./helpers";

// OASIS.md §13: un lead con UTM conserva su campaña hasta la reserva y aparece en el CAC.
test.describe("recorrido completo con UTM (serial, solo desktop)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(({ isMobile }) => isMobile, "Muta datos");

  const CAMPAIGN = "bodas-cac-e2e";
  const EMAIL = "recorrido.e2e@test.pe";

  test("lead con UTM → pre-reserva → adelanto validado → Separada → CAC", async ({ page }) => {
    // 1. Visita desde un anuncio y deja sus datos
    await page.goto(`/bodas?utm_source=facebook&utm_medium=paid&utm_campaign=${CAMPAIGN}`);
    await page.getByLabel("Nombre").fill("Recorrido E2E");
    await page.getByLabel("Celular / WhatsApp").fill("955444333");
    await page.getByLabel("Correo").fill(EMAIL);
    await page.getByLabel(/Acepto el/).check();
    await page.getByRole("button", { name: "Solicitar cotización" }).click();
    await expect(page.getByText("¡Gracias! Recibimos tu consulta.")).toBeVisible();
    const [lead] = await db<{ id: string; channel: string; utm_campaign: string }>(
      `select l.id, l.channel, l.utm_campaign from leads l join clients c on c.id = l.client_id where c.email = $1`,
      [EMAIL],
    );
    expect(lead).toMatchObject({ channel: "direct", utm_campaign: CAMPAIGN });

    // 2. La campaña tiene inversión este mes
    const [{ month }] = await db<{ month: string }>(
      `select to_char(date_trunc('month', now() at time zone 'America/Lima'), 'YYYY-MM-DD') as month`,
    );
    await db(
      `with c as (insert into campaigns (venue_id, platform, name, utm_campaign)
                  select id, 'meta', 'Bodas CAC E2E', $1 from venues limit 1 returning id)
       insert into campaign_spend (campaign_id, month, amount) select id, $2::date, 600 from c`,
      [CAMPAIGN, month],
    );

    // 3. Operaciones crea la pre-reserva desde el lead
    await loginAs(page, "admin@demo.oasis.test");
    await page.goto(`/admin/crm/${lead.id}`);
    await page.getByLabel("Fecha", { exact: true }).fill("2027-07-17");
    await page.getByLabel("Invitados", { exact: true }).fill("100");
    await page.locator("#b-type").selectOption("wedding");
    await page.getByRole("button", { name: "Crear pre-reserva" }).click();
    await expect(page).toHaveURL(/\/admin\/reservas\//);
    const bookingId = page.url().split("/admin/reservas/")[1].split(/[/?#]/)[0];

    // 4. Adelanto registrado y validado por el admin → Separada
    const [{ deposit }] = await db<{ deposit: string }>(
      `select deposit_amount::text as deposit from bookings where id = $1`,
      [bookingId],
    );
    const form = page.getByRole("form", { name: "Registrar pago" });
    await form.getByLabel("Monto S/").fill(deposit);
    await form.getByLabel("Medio").selectOption("transfer");
    await form.getByLabel("N.º de operación").fill("TRF-RECORRIDO-E2E");
    await form.getByLabel(/Voucher/).setInputFiles(path.join(__dirname, "fixtures/voucher.png"));
    await form.getByRole("button", { name: "Registrar pago" }).click();
    await page.getByRole("button", { name: "Validar" }).click();
    await expect(page.getByText("(Validado)", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Marcar como Separada" }).click();
    await expect(page.getByText("Separada", { exact: true }).first()).toBeVisible();

    // 5. La reserva conserva la campaña del lead
    const [b] = await db<{ status: string; channel: string; utm: string; stage: string }>(
      `select b.status, b.channel, l.utm_campaign as utm, l.stage from bookings b join leads l on l.id = b.lead_id where b.id = $1`,
      [bookingId],
    );
    expect(b).toEqual({ status: "reserved", channel: "direct", utm: CAMPAIGN, stage: "reserved" });

    // 6. Aparece en el CAC por campaña (Finanzas) …
    await page.goto("/admin/finanzas");
    const row = page
      .getByRole("row")
      .filter({ has: page.getByRole("cell", { name: CAMPAIGN, exact: true }) });
    await expect(row).toContainText("S/ 600.00");
    await expect(row.getByRole("cell").nth(-2)).toHaveText("1"); // ganados
    await expect(row.getByRole("cell").last()).toContainText("600.00"); // CAC

    // … y en el CAC del canal directo del dashboard, que cuadra con un conteo independiente
    const [exp] = await db<{ closed: number; spend: string }>(
      `select (select count(*)::int from bookings
                where channel = 'direct' and status in ('reserved','confirmed','done','settled')
                  and date_trunc('month', created_at at time zone 'America/Lima') = $1::date) as closed,
              (select coalesce(sum(amount), 0)::text from campaign_spend where month = $1::date) as spend`,
      [month],
    );
    await page.goto(`/admin/dashboard?mes=${month.slice(0, 7)}`);
    const card = page
      .locator("div.rounded-xl")
      .filter({ hasText: "Canal directo: CAC vs." })
      .last();
    await expect(card).toContainText(`Reservas directas cerradas${exp.closed}`);
    const cac = (Number(exp.spend) / exp.closed).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    await expect(card).toContainText(new RegExp(`CAC\\s*S/\\s${cac.replace(".", "\\.")}`));
  });
});
