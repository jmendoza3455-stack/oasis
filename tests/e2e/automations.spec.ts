import { expect, test } from "@playwright/test";
import { db, loginAs, shot } from "./helpers";

test("el endpoint de cron exige el secreto", async ({ request }) => {
  expect((await request.get("/api/cron/diario")).status()).toBe(401);
  expect(
    (await request.get("/api/cron/diario", { headers: { Authorization: "Bearer otro" } })).status(),
  ).toBe(401);
  const res = await request.get("/api/cron/sla", {
    headers: { Authorization: "Bearer e2e-cron-secret" },
  });
  expect(res.status()).toBe(200);
  expect((await res.json()).job).toBe("sla");
  expect(
    (
      await request.get("/api/cron/otro", { headers: { Authorization: "Bearer e2e-cron-secret" } })
    ).status(),
  ).toBe(404);
});

test.describe("avisos automáticos (serial, solo desktop)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(({ isMobile }) => isMobile, "Muta datos");

  test("recordatorio de saldo por correo y WhatsApp, sin duplicados", async ({ page }, info) => {
    const [b] = await db<{ id: string }>(
      `update bookings set balance_due_on = (now() at time zone 'America/Lima')::date + 2
        where id = (select id from bookings where status = 'reserved' and planner_id is null
                       and rental_gross > public.booking_paid(id)
                       and event_date > (now() at time zone 'America/Lima')::date + 10
                     order by event_date limit 1)
        returning id`,
    );
    expect(b).toBeTruthy();
    await db(
      `update clients set phone = '987654321' where id = (select client_id from bookings where id = $1)`,
      [b.id],
    );

    await loginAs(page, "admin@demo.oasis.test");
    await page.goto("/admin/avisos");
    const form = page.getByRole("form", { name: "Ejecutar proceso" });
    await form.getByLabel("Proceso").selectOption("diario");
    await form.getByRole("button", { name: "Ejecutar ahora" }).click();
    await expect(form.getByRole("status")).toContainText("avisos nuevos");

    const rows = await db<{ channel: string; status: string; recipient: string | null }>(
      `select channel, status, recipient from notifications where booking_id = $1 and kind = 'balance_due_soon' order by channel`,
      [b.id],
    );
    expect(rows.map((r) => r.channel)).toEqual(["email", "whatsapp"]);
    // Sin RESEND_API_KEY el correo queda registrado como no enviado; el WhatsApp, en cola manual
    expect(rows[1]).toMatchObject({ status: "queued", recipient: "987654321" });
    const [digest] = await db<{ recipient: string }>(
      `select recipient from notifications where kind = 'ops_daily'`,
    );
    expect(digest.recipient).toContain("ops@demo.oasis.test");

    // Idempotencia: una segunda corrida no duplica
    await form.getByRole("button", { name: "Ejecutar ahora" }).click();
    await expect(form.getByRole("status")).toContainText("avisos nuevos");
    const [{ n }] = await db<{ n: number }>(
      `select count(*)::int as n from notifications where booking_id = $1 or kind = 'ops_daily'`,
      [b.id],
    );
    expect(n).toBe(3);

    const item = page
      .getByRole("listitem")
      .filter({ hasText: "Saldo por vencer" })
      .filter({
        has: page.getByRole("link", { name: "Abrir WhatsApp" }),
      });
    await expect(item.getByRole("link", { name: "Abrir WhatsApp" })).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/51987654321\?text=/,
    );
    await shot(page, info, "admin-avisos");
    await item.getByRole("button", { name: "Marcar enviado" }).click();
    await expect
      .poll(async () => {
        const [w] = await db<{ status: string }>(
          `select status from notifications where booking_id = $1 and kind = 'balance_due_soon' and channel = 'whatsapp'`,
          [b.id],
        );
        return w.status;
      })
      .toBe("sent");
  });

  test("alerta de lead sin respuesta fuera del SLA", async ({ page }) => {
    const [lead] = await db<{ id: string }>(
      `with c as (insert into clients (full_name, phone) values ('Lead SLA E2E', '911222333') returning id)
       insert into leads (venue_id, client_id, channel, event_type, created_at)
       select v.id, c.id, 'direct', 'wedding', now() - interval '3 days' from venues v, c
       returning id`,
    );
    await loginAs(page, "admin@demo.oasis.test");
    await page.goto("/admin/avisos");
    const form = page.getByRole("form", { name: "Ejecutar proceso" });
    await form.getByLabel("Proceso").selectOption("sla");
    await form.getByRole("button", { name: "Ejecutar ahora" }).click();
    await expect(form.getByRole("status")).toContainText("avisos nuevos");
    const [n] = await db<{ body: string }>(
      `select body from notifications where lead_id = $1 and kind = 'lead_sla'`,
      [lead.id],
    );
    expect(n.body).toContain("Lead SLA E2E");
    await expect(page.getByText("Lead sin respuesta").first()).toBeVisible();
  });

  test("resumen semanal a socios", async ({ page }) => {
    await loginAs(page, "admin@demo.oasis.test");
    await page.goto("/admin/avisos");
    const form = page.getByRole("form", { name: "Ejecutar proceso" });
    await form.getByLabel("Proceso").selectOption("semanal");
    await form.getByRole("button", { name: "Ejecutar ahora" }).click();
    await expect(form.getByRole("status")).toContainText("avisos nuevos");
    const [n] = await db<{ body: string; recipient: string }>(
      `select body, recipient from notifications where kind = 'weekly_summary'`,
    );
    expect(n.recipient).toBe("admin@demo.oasis.test");
    expect(n.body).toContain("Ocupación comprometida a 90 días");
  });

  test("feed iCal con URL secreta", async ({ page, request }) => {
    await loginAs(page, "admin@demo.oasis.test");
    await page.goto("/admin/avisos");
    const url = new URL((await page.getByLabel("URL del feed iCal").textContent())!);
    const res = await request.get(url.pathname);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/calendar");
    const ics = await res.text();
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).not.toMatch(/@demo\.oasis\.test|987654321/);
    expect((await request.get("/api/ical/token-invalido.ics")).status()).toBe(404);
  });
});

test("ops no ve los procesos ni el feed", async ({ page }, info) => {
  await loginAs(page, "ops@demo.oasis.test");
  await page.goto("/admin/avisos");
  await expect(page.getByRole("heading", { name: "Avisos", exact: true })).toBeVisible();
  await expect(page.getByRole("form", { name: "Ejecutar proceso" })).toHaveCount(0);
  await expect(page.getByLabel("URL del feed iCal")).toHaveCount(0);
  await shot(page, info, "admin-avisos-ops");
});
