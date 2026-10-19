import { expect, test } from "@playwright/test";
import { db, loginAs, shot } from "./helpers";

test.describe("back-office · calendario y reservas", () => {
  test("el admin ingresa y ve el calendario maestro", async ({ page }, info) => {
    await loginAs(page, "admin@demo.oasis.test");
    await expect(page).toHaveURL(/\/admin\/calendario/);
    await expect(page.getByRole("heading", { name: "Calendario maestro" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Leyenda de estados" })).toBeVisible();
    await shot(page, info, "admin-calendario");
  });

  test("la ficha muestra montos con y sin IGV y bloquea Separar sin adelanto", async ({
    page,
  }, info) => {
    // Pre-reserva propia (S/ 4,500.00 sin IGV): no depende del orden de otros tests
    const [b] = await db<{ id: string }>(
      `with c as (insert into clients (full_name, phone) values ('Ficha IGV E2E', '977888999') returning id)
       insert into bookings (venue_id, client_id, channel, event_type, event_date, guests, rental_list_net)
       select v.id, c.id, 'direct', 'wedding', $1::date, 100, 4500 from venues v, c returning id`,
      [info.project.name === "mobile" ? "2031-03-15" : "2031-03-22"],
    );
    await loginAs(page, "admin@demo.oasis.test");
    await page.goto(`/admin/reservas/${b.id}`);
    await expect(page.getByText("Pre-reserva", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Alquiler sin IGV")).toBeVisible();
    await expect(page.getByText(/S\/\s?4,500\.00/).first()).toBeVisible();
    await expect(page.getByText(/S\/\s?5,310\.00/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Marcar como Separada" })).toBeDisabled();
    await expect(page.getByText("Falta validar el adelanto.")).toBeVisible();
    await shot(page, info, "admin-reserva");
  });

  test("operaciones no puede separar ni confirmar", async ({ page }) => {
    const [b] = await db<{ id: string }>(
      `select id from bookings where status = 'reserved' order by event_date limit 1`,
    );
    await loginAs(page, "ops@demo.oasis.test");
    await page.goto(`/admin/reservas/${b.id}`);
    await expect(page.getByRole("button", { name: "Marcar como Confirmada" })).toBeDisabled();
    await expect(page.getByText("No tienes permiso para hacer este cambio.").first()).toBeVisible();
  });

  test("un planner no entra al back-office", async ({ page }) => {
    await loginAs(page, "usuario.planner1@demo.oasis.test");
    await page.goto("/admin/calendario");
    await expect(page).toHaveURL(/\/ingresar\?error=sin_acceso/);
  });
});

test.describe("back-office · cambios (serial, solo desktop)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(({ isMobile }) => isMobile, "Muta datos: corre una sola vez");

  test("cancelar una pre-reserva exige motivo y libera la fecha", async ({ page }) => {
    const [b] = await db<{ id: string; event_date: string }>(
      `select id, to_char(event_date, 'YYYY-MM-DD') as event_date from bookings
        where status = 'prebooked' order by event_date desc limit 1`,
    );
    await loginAs(page, "admin@demo.oasis.test");
    await page.goto(`/admin/reservas/${b.id}`);
    await page.getByRole("button", { name: "Cancelar reserva" }).click();
    const confirm = page.getByRole("button", { name: "Confirmar cancelación" });
    await expect(confirm).toBeDisabled();
    await page.getByLabel("Motivo de la cancelación").fill("Cliente eligió otra fecha (E2E)");
    await confirm.click();
    await expect(page.getByText("Cancelada", { exact: true }).first()).toBeVisible();
    const [free] = await db<{ ok: boolean }>(
      `select is_date_available('oasis-pachacamac', $1) as ok`,
      [b.event_date],
    );
    expect(free.ok).toBe(true);
  });

  test("bloquear fechas desde el calendario en un clic", async ({ page }, info) => {
    await loginAs(page, "admin@demo.oasis.test");
    const heading = page.getByRole("heading", { level: 2 }).first();
    for (let i = 0; i < 3; i++) {
      const before = await heading.innerText();
      await page.getByRole("button", { name: "Mes siguiente" }).click();
      await expect(heading).not.toHaveText(before);
    }
    const title = await heading.innerText();
    const cell = page.getByRole("cell", { name: `15 de ${title}`, exact: true });
    await cell.click({ position: { x: 30, y: 50 } });
    await expect(page.getByRole("heading", { name: "Bloquear fechas" })).toBeVisible();
    await page.getByLabel("Motivo").fill("Pintado de terraza (E2E)");
    await page.getByRole("button", { name: "Bloquear" }).click();
    await expect(page.getByText("Bloqueado · Pintado de terraza (E2E)").first()).toBeVisible();
    await shot(page, info, "admin-bloqueo");
  });
});
