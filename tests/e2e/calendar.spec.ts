import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { calendarReady, db, pickDate, shot } from "./helpers";

// Calendario vivo (docs/261019 Calendario vivo - evidencia.md): estados reales, carrera al tocar,
// teclado (patrón grid de WAI-ARIA) y accesibilidad automática.

const SLUG = "oasis-pachacamac";

/** Fecha libre de febrero 2028 distinta por proyecto (desktop y móvil corren en paralelo). */
async function freeDate(offset: number) {
  const [row] = await db<{ d: string }>(
    `select to_char(d, 'YYYY-MM-DD') as d
       from generate_series('2028-02-01'::date + $2::int, '2028-02-27'::date, interval '1 day') d
      where public.is_date_available($1, d::date) order by d limit 1`,
    [SLUG, offset],
  );
  return row.d;
}

async function openCalendar(page: import("@playwright/test").Page, path = "/bodas") {
  await page.goto(path);
  await expect(page.getByRole("form", { name: "Consultar fecha y precio" })).toHaveAttribute(
    "data-ready",
    "",
  );
  return calendarReady(page);
}

test("si la fecha se ocupa mientras el cliente mira, avisa, refresca y sugiere otras", async ({
  page,
}, info) => {
  const date = await freeDate(info.project.name === "mobile" ? 14 : 0);
  await openCalendar(page);
  // Navega hasta el mes sin tocar el día todavía
  const cal = await calendarReady(page);
  for (let i = 0; i < 24; i++) {
    if ((await cal.getByRole("grid").getAttribute("data-month")) === "2028-02") break;
    await cal.getByRole("button", { name: "Mes siguiente" }).click();
    await calendarReady(page);
  }
  const cell = cal.locator(`button[data-date="${date}"]`);
  await expect(cell).toHaveAttribute("data-status", "free");

  // Otra persona lo bloquea en el back-office
  const [block] = await db<{ id: string }>(
    `insert into blocks (venue_id, starts_on, ends_on, reason)
     select id, $2, $2, 'E2E carrera' from venues where slug = $1 returning id`,
    [SLUG, date],
  );
  try {
    await cell.click();
    await expect(page.getByText(/se acaba de ocupar/)).toBeVisible();
    await expect(page.getByText("Fechas libres cercanas:")).toBeVisible();
    await calendarReady(page);
    await expect(cell).toHaveAttribute("data-status", "taken");
    await expect(cell).toHaveAccessibleName(/ocupado/);
    // Una alternativa sugerida sí está libre
    await page
      .locator("div", { has: page.getByText("Fechas libres cercanas:") })
      .last()
      .getByRole("button", { name: /\d{2}\/\d{2}\/\d{4}/ })
      .first()
      .click();
    await expect(page.getByText(/está libre!/)).toBeVisible();
  } finally {
    await db(`delete from blocks where id = $1`, [block.id]);
  }
});

test("muestra libre, en espera y ocupado sin datos de terceros", async ({ page }, info) => {
  const [hold] = await db<{ d: string }>(
    `select to_char(event_date, 'YYYY-MM-DD') as d from bookings
      where status = 'prebooked' and hold_expires_at > now() + interval '1 hour' and event_date > current_date
        and not overnight
      order by event_date limit 1`,
  );
  const [taken] = await db<{ d: string }>(
    `select to_char(event_date, 'YYYY-MM-DD') as d from bookings
      where status in ('reserved', 'confirmed') and event_date > current_date
      order by event_date limit 1`,
  );
  test.skip(!hold || !taken, "El seed no tiene una pre-reserva y una reserva futuras");
  await openCalendar(page);

  await pickDate(page, hold.d);
  const holdCell = page.locator(`button[data-date="${hold.d}"]`);
  await expect(holdCell).toHaveAttribute("data-status", "hold");
  await expect(holdCell).toHaveAccessibleName(/en espera/);
  await expect(page.getByText(/está en espera: alguien la está separando/)).toBeVisible();
  await shot(page, info, "calendario-espera");

  await pickDate(page, taken.d);
  const takenCell = page.locator(`button[data-date="${taken.d}"]`);
  await expect(takenCell).toHaveAttribute("data-status", "taken");
  await expect(page.getByText(/ya está reservado/)).toBeVisible();

  // Nunca nombres, tipo de evento ni planner en el calendario
  const names = await db<{ n: string }>(
    `select c.full_name as n from bookings b join clients c on c.id = b.client_id
      where b.event_date in ($1::date, $2::date)`,
    [hold.d, taken.d],
  );
  const text = await page.locator("[data-calendar]").innerText();
  const labels = await page
    .locator("[data-calendar] button[data-date]")
    .evaluateAll((els) => els.map((e) => e.textContent).join(" "));
  for (const { n } of names) {
    expect(text).not.toContain(n);
    expect(labels).not.toContain(n);
  }
  expect(labels).not.toMatch(/boda|corporativo|planner/i);
});

test("se usa solo con teclado (patrón grid de WAI-ARIA)", async ({ page, isMobile }) => {
  test.skip(isMobile, "Teclado físico: solo desktop");
  await openCalendar(page, "/full-day");
  await pickDate(page, "2027-01-16");
  // El día elegido queda con foco; flechas, AvPág/RePág, Inicio/Fin y Enter
  const focused = () => page.evaluate(() => document.activeElement?.getAttribute("data-date"));
  await page.locator('button[data-date="2027-01-16"]').focus();
  await page.keyboard.press("ArrowRight");
  expect(await focused()).toBe("2027-01-17");
  await page.keyboard.press("ArrowDown");
  expect(await focused()).toBe("2027-01-24");
  await page.keyboard.press("Home");
  expect(await focused()).toBe("2027-01-18"); // lunes de esa semana
  await page.keyboard.press("End");
  expect(await focused()).toBe("2027-01-24"); // domingo
  await page.keyboard.press("PageDown");
  await calendarReady(page);
  await expect.poll(focused).toBe("2027-02-24");
  await page.keyboard.press("PageUp");
  await calendarReady(page);
  await expect.poll(focused).toBe("2027-01-24");
  await page.keyboard.press("ArrowLeft"); // sábado 23
  await page.keyboard.press("ArrowLeft"); // viernes 22
  await page.keyboard.press("Enter");
  await expect(page.getByText(/El viernes 22\/01\/2027/)).toBeVisible();
});

test("sin violaciones de accesibilidad automáticas (axe-core, WCAG 2.1 AA)", async ({ page }) => {
  const audit = async (label: string) => {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    return results.violations.map(
      (v) => `${label} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
    );
  };
  await page.goto("/");
  await page
    .getByRole("group", { name: "Tipo de evento" })
    .getByRole("button", { name: /^Bodas/ })
    .click();
  await calendarReady(page);
  const home = await audit("/");
  await openCalendar(page, "/bodas");
  const bodas = await audit("/bodas");
  expect([...home, ...bodas]).toEqual([]);
});
