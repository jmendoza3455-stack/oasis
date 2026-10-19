import { expect, test } from "@playwright/test";
import { db, loginAs, shot } from "./helpers";

// F1 · Varios locales: el admin cambia de local en el back-office y asigna personal por local;
// operaciones solo ve su local y no ve la pantalla de equipo.

test.describe("varios locales (serial)", () => {
  test.describe.configure({ mode: "serial" });
  const slug = `e2e-local-${process.pid}`;
  const name = `Local E2E ${process.pid}`;

  test.beforeAll(async () => {
    await db(`insert into venues (slug, name) values ($1, $2) on conflict (slug) do nothing`, [
      slug,
      name,
    ]);
  });
  test.afterAll(async () => {
    await db(`delete from venues where slug = $1`, [slug]);
  });

  test("el admin cambia de local y el back-office muestra el elegido", async ({ page }, info) => {
    await loginAs(page, "admin@demo.oasis.test");
    await page.goto("/admin/calendario");
    const select = page.getByRole("combobox", { name: "Local" });
    await expect(select).toHaveValue("oasis-pachacamac");
    await select.selectOption(slug);
    await expect(select).toHaveValue(slug);
    await page.reload();
    await expect(page.getByRole("combobox", { name: "Local" })).toHaveValue(slug);
    await shot(page, info, "admin-selector-local");
    // Vuelve al local demo para no afectar otras pruebas de este contexto
    await page.getByRole("combobox", { name: "Local" }).selectOption("oasis-pachacamac");
    await expect(page.getByRole("combobox", { name: "Local" })).toHaveValue("oasis-pachacamac");
  });

  test("el admin da acceso a un local en Equipo; operaciones no ve Equipo", async ({
    page,
    isMobile,
  }, info) => {
    test.skip(isMobile, "Gestión de equipo: flujo de escritorio");
    await loginAs(page, "admin@demo.oasis.test");
    await page.goto("/admin/equipo");
    const ops = page.getByRole("listitem").filter({ hasText: "ops@demo.oasis.test" });
    const box = ops.getByRole("checkbox", { name: name });
    await expect(box).not.toBeChecked();
    await box.check();
    await expect(ops.getByText("Acceso dado.")).toBeVisible();
    const [m] = await db<{ n: number }>(
      `select count(*)::int n from venue_members m join venues v on v.id = m.venue_id
        join profiles p on p.id = m.user_id where v.slug = $1 and p.email = 'ops@demo.oasis.test'`,
      [slug],
    );
    expect(m.n).toBe(1);
    // El admin no puede quitarse su propio acceso
    const me = page.getByRole("listitem").filter({ hasText: "admin@demo.oasis.test" });
    await expect(me.getByRole("combobox", { name: "Rol" })).toBeDisabled();
    await shot(page, info, "admin-equipo");

    await loginAs(page, "ops@demo.oasis.test");
    await page.goto("/admin/calendario");
    await expect(page.getByRole("link", { name: "Equipo" })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Local" })).toBeVisible();
    await db(`delete from venue_members where venue_id = (select id from venues where slug = $1)`, [
      slug,
    ]);
  });

  test("sin Google configurado, el ingreso no muestra el botón", async ({ page }) => {
    await page.goto("/ingresar");
    await expect(page.getByRole("button", { name: "Continuar con Google" })).toHaveCount(0);
  });
});
