import { expect, test } from "@playwright/test";
import { db, loginAs, shot } from "./helpers";

// Conteo manual independiente de la lógica de dominio: días vendidos / días disponibles del mes,
// V-S-D + feriados vs. L-J, descontando bloqueos (OASIS.md §13).
async function manualCount(month: string) {
  const [r] = await db<{ ws: number; wa: number; ds: number; da: number }>(
    `with days as (
       select d::date as d from generate_series($1::date, ($1::date + interval '1 month' - interval '1 day'), interval '1 day') d
     ), avail as (
       select d, (extract(dow from d) in (0, 5, 6) or exists (select 1 from holidays h where h.date = d and h.type = 'feriado')) as we
         from days where not exists (select 1 from blocks b where d between b.starts_on and b.ends_on)
     ), sold as (
       select distinct event_date as d from bookings where status in ('reserved', 'confirmed', 'done', 'settled')
     )
     select count(*) filter (where we and d in (select d from sold))::int as ws,
            count(*) filter (where we)::int as wa,
            count(*) filter (where not we and d in (select d from sold))::int as ds,
            count(*) filter (where not we)::int as da
       from avail`,
    [month],
  );
  return r;
}

test("la ocupación del dashboard cuadra con el conteo manual del mes", async ({ page }, info) => {
  await loginAs(page, "admin@demo.oasis.test");
  // Mes siguiente: el seed tiene eventos vendidos a +20/+30 días
  const [{ month }] = await db<{ month: string }>(
    `select to_char(date_trunc('month', (now() at time zone 'America/Lima') + interval '1 month'), 'YYYY-MM-DD') as month`,
  );
  await expect(async () => {
    const m = await manualCount(month);
    await page.goto(`/admin/dashboard?mes=${month.slice(0, 7)}`);
    const tile = (name: string) => page.getByRole("group", { name, exact: true });
    await expect(tile("Fin de semana y feriados (V-S-D)")).toContainText(
      `${m.ws} de ${m.wa} días`,
      {
        timeout: 2000,
      },
    );
    await expect(tile("Entre semana (L-J)")).toContainText(`${m.ds} de ${m.da} días`, {
      timeout: 2000,
    });
  }).toPass({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: /Ocupación ·/ })).toBeVisible();
  await expect(page.getByText("Pipeline en S/ (eventos futuros, con IGV)")).toBeVisible();
  await shot(page, info, "admin-dashboard");
});

test("los filtros por canal y segmento se aplican por URL", async ({ page }) => {
  await loginAs(page, "admin@demo.oasis.test");
  await page.goto("/admin/dashboard");
  const form = page.getByRole("form", { name: "Filtros del dashboard" });
  await form.getByLabel("Canal").selectOption("planner");
  await form.getByLabel("Segmento").selectOption("wedding");
  await form.getByRole("button", { name: "Aplicar" }).click();
  await page.waitForURL(/canal=planner/);
  await expect(page).toHaveURL(/tipo=wedding/);
  await expect(page.getByText(/Con filtros: la ocupación cuenta solo/)).toBeVisible();
});
