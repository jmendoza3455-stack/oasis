import { expect, test } from "@playwright/test";
import { db, loginAs, shot } from "./helpers";

// Equipo de marketing: el staff sube clips desde el celular; el admin revisa, pide cambios,
// aprueba, marca publicada y carga resultados. Operaciones no decide.

test.describe("marketing (serial)", () => {
  test.describe.configure({ mode: "serial" });

  const code = `e2e${process.pid}`; // único por proceso de Playwright (desktop y móvil corren en paralelo)
  const piece = async (n: number) =>
    (
      await db<{ id: string }>(
        `insert into marketing_pieces (venue_id, code, version, kind, title, pillar, status, caption, hashtags, qa, review, created_by_agent)
         select id, $1, $2, 'reel', $3, 'Obra', 'review', 'Renovamos Oasis Pachacámac. Link en la bio.', '#Pachacamac',
                '{"score": 95, "ok": true, "checks": [{"id": "figures", "label": "Cifras en pantalla verificadas", "ok": false, "severity": "warning", "detail": "verificar: 17/12"}]}',
                '{"score": 88, "verdict": "aprobar", "notes": ["Gancho claro en 1 s"]}', 'editor'
           from venues where slug = 'oasis-pachacamac' returning id`,
        [code, n, `Estamos renovando (prueba E2E ${code} v${n})`],
      )
    )[0].id;

  test.afterAll(async () => {
    await db(`delete from marketing_pieces where code = $1`, [code]);
    await db(`delete from marketing_clips where notes like 'E2E piscina%'`);
    await db(`delete from marketing_link_clicks where code = $1`, [code]);
  });

  test("operaciones sube clips desde el celular y no puede decidir piezas", async ({
    page,
  }, info) => {
    await piece(1);
    await loginAs(page, "ops@demo.oasis.test");
    await page.goto("/admin/marketing");
    await page.getByLabel("¿Qué muestran? (opcional)").fill(`E2E piscina ${info.project.name}`);
    await page.locator("#clip-files").setInputFiles({
      name: "piscina mañana.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from("video de prueba"),
    });
    await expect(page.getByText("Listo")).toBeVisible();
    await expect(
      page.getByText(`piscina mañana.mp4 · E2E piscina ${info.project.name}`),
    ).toBeVisible();
    // Formato no permitido
    await page
      .locator("#clip-files")
      .setInputFiles({ name: "nota.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
    await expect(page.getByText(/Formato no permitido/)).toBeVisible();
    // Ve la pieza pero sin botones de decisión
    await expect(page.getByText(`Estamos renovando (prueba E2E ${code} v1)`)).toBeVisible();
    await expect(page.getByRole("button", { name: "Aprobar" })).toHaveCount(0);
    await shot(page, info, "marketing-ops");
  });

  test("el admin pide cambios con comentario, aprueba la nueva versión, publica y mide", async ({
    page,
    isMobile,
  }, info) => {
    test.skip(
      isMobile,
      "Flujo de escritorio; la vista móvil se cubre en la captura del primer test",
    );
    await loginAs(page, "admin@demo.oasis.test");
    await page.goto("/admin/marketing");
    const v1 = page.getByRole("listitem").filter({ hasText: `${code} v1` });
    await expect(v1.getByText("Director creativo 88/100")).toBeVisible();
    await expect(v1.getByText("Técnico 95/100")).toBeVisible();
    await v1.getByText("Observaciones técnicas (1)").click();
    await expect(v1.getByText(/verificar: 17\/12/)).toBeVisible();

    // Pedir cambios exige comentario
    await v1.getByRole("button", { name: "Pedir cambios" }).click();
    await v1.getByLabel("¿Qué cambiar?").fill("Gancho más corto");
    await v1.getByRole("button", { name: "Enviar cambios" }).click();
    await expect(page.getByRole("heading", { name: "En cambios" })).toBeVisible();
    await expect(page.getByText("Tu comentario: Gancho más corto")).toBeVisible();

    // El editor entrega la v2 (como lo haría `pnpm marketing submit`)
    await db(
      `update marketing_pieces set status = 'discarded' where code = $1 and status = 'changes'`,
      [code],
    );
    await piece(2);
    await page.reload();
    const v2 = page.getByRole("listitem").filter({ hasText: `${code} v2` });
    await v2.getByRole("button", { name: "Aprobar" }).click();
    // Pasa a "Listas para publicar" con el formulario de publicación
    const ready = page.getByRole("listitem").filter({ hasText: `${code} v2` });
    await expect(ready.getByRole("button", { name: "Copiar caption" })).toBeVisible();
    await expect(ready.getByRole("button", { name: "Link WhatsApp" })).toBeVisible();
    await ready
      .getByLabel("Enlace en Instagram")
      .fill("https://www.instagram.com/reel/prueba-e2e/");
    await ready.getByRole("button", { name: "Marcar publicada" }).click();
    // Pasa a "Publicadas y resultados"
    const pub = page
      .getByRole("listitem")
      .filter({ hasText: `${code} v2` })
      .filter({ has: page.getByRole("link", { name: "instagram" }) });
    await pub.getByLabel("Alcance").fill("1200");
    await pub.getByLabel("Guardados").fill("40");
    await pub.getByLabel("Tasa de salto %").fill("32.5");
    await pub.getByRole("button", { name: "Guardar resultados" }).click();
    await expect(page.getByText("Resultados guardados.")).toBeVisible();
    const [row] = await db<{ metrics: Record<string, number>; status: string }>(
      `select metrics, status from marketing_pieces where code = $1 and version = 2`,
      [code],
    );
    expect(row.status).toBe("published");
    expect(row.metrics).toMatchObject({ reach: 1200, saves: 40, skip_rate: 32.5 });
    // Atribución y laboratorio
    await expect(
      pub.getByText(/Clics web \d+ · WhatsApp \d+ · Leads 0 · Separaciones 0/),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Calibración del director creativo" }),
    ).toBeVisible();
    await shot(page, info, "marketing-admin");
  });

  test("el link de la pieza lleva a la web con su código y registra el clic", async ({ page }) => {
    const before = async () =>
      (
        await db<{ n: number }>(
          `select count(*)::int as n from marketing_link_clicks where code = $1 and network = 'tiktok'`,
          [code],
        )
      )[0].n;
    const start = await before();
    await page.goto(`/r/${code.toUpperCase()}?s=tiktok`);
    await expect(page).toHaveURL(
      new RegExp(`utm_source=tiktok&utm_medium=social&utm_campaign=organico&utm_content=${code}`),
    );
    await expect.poll(before).toBe(start + 1);
  });
});
