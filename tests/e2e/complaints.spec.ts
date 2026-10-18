import { expect, test } from "@playwright/test";
import { db, loginAs, shot } from "./helpers";

test.describe("Libro de Reclamaciones en el back-office (serial, solo desktop)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(({ isMobile }) => isMobile, "Muta datos");

  test("operaciones ve el plazo y registra la respuesta", async ({ page }, info) => {
    const [c] = await db<{ code: string }>(
      `insert into complaints (venue_id, kind, full_name, document_type, document_number, address, email,
                               service_description, detail, request, due_on)
       select id, 'reclamo', 'Consumidor E2E', 'DNI', '12345678', 'Av. Prueba 123', 'consumidor.e2e@test.pe',
              'Alquiler del local', 'La piscina no estaba lista a la hora pactada.', 'Descuento proporcional',
              (now() at time zone 'America/Lima')::date + 3
         from venues limit 1
       returning code`,
    );
    await loginAs(page, "ops@demo.oasis.test");
    await page.goto("/admin/reclamos");
    const form = page.getByRole("form", { name: `Responder ${c.code}` });
    await expect(page.getByText(/Vence el .* \(3 días\)/).first()).toBeVisible();
    await shot(page, info, "admin-reclamos");
    await form.getByLabel("Respuesta al consumidor").fill("Corto");
    await form.getByRole("button", { name: "Registrar respuesta" }).click();
    await expect(form.getByRole("status")).toContainText("mínimo 20 caracteres");
    await form
      .getByLabel("Respuesta al consumidor")
      .fill("Lamentamos lo ocurrido. Aplicamos un descuento del 10 % sobre el alquiler.");
    await form.getByRole("button", { name: "Registrar respuesta" }).click();
    await expect(page.getByText(/Respondido el/).first()).toBeVisible();
    const [row] = await db<{ responded: boolean }>(
      `select responded_at is not null as responded from complaints where code = $1`,
      [c.code],
    );
    expect(row.responded).toBe(true);
  });
});

test("la pantalla de reclamos se ve en móvil", async ({ page }, info) => {
  await loginAs(page, "ops@demo.oasis.test");
  await page.goto("/admin/reclamos");
  await expect(page.getByRole("heading", { name: "Libro de Reclamaciones" })).toBeVisible();
  await shot(page, info, "admin-reclamos-lista");
});
