import { expect, type Page, type TestInfo } from "@playwright/test";
import pg from "pg";

export const DEV_DB_URL =
  process.env.E2E_DB_URL ?? "postgres://postgres:postgres@localhost:5432/oasis_dev";

export async function db<T extends pg.QueryResultRow>(sql: string, params: unknown[] = []) {
  const client = new pg.Client({ connectionString: DEV_DB_URL });
  await client.connect();
  try {
    return (await client.query<T>(sql, params)).rows;
  } finally {
    await client.end();
  }
}

export async function loginAs(page: Page, email: string) {
  await page.goto("/ingresar");
  await page.getByRole("button", { name: new RegExp(email.replace(".", "\\.")) }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/ingresar"));
}

export async function shot(page: Page, info: TestInfo, name: string) {
  await page.screenshot({
    path: `test-results/screenshots/${name}-${info.project.name}.png`,
    fullPage: true,
  });
}

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "setiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
/** Etiqueta accesible de FullCalendar para un día ("22 de noviembre de 2026"). */
export function dayLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${MONTHS[m - 1]} de ${y}`;
}

export async function expectNoA11yBasics(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("lang", "es-PE");
}

/** Texto plano de un PDF (espacios normalizados) para verificar montos y datos. */
export async function pdfText(data: Buffer): Promise<string> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(data), useSystemFonts: true }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    parts.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" "));
  }
  return parts.join(" ").replace(/\s+/g, " ");
}

/** Monto como lo imprime la app ("S/ 1,234.50"), con espacios normalizados. */
export const pen = (n: number | string) =>
  `S/ ${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Flujo único de cotización (componente QuoteFlow) en la página actual. */
const CARD_FOR_TYPE: Record<string, RegExp> = {
  wedding: /^Bodas/,
  social: /^Bodas/,
  corporate: /^Empresas/,
  family_day: /^Full day/,
};

/** En la home el tipo se elige con las tarjetas "¿Qué quieres celebrar?" antes de ver la fecha. */
async function chooseEvent(page: Page, type = "wedding") {
  const chooser = page.getByRole("group", { name: "Tipo de evento" });
  if ((await chooser.count()) === 0) return;
  await chooser.getByRole("button", { name: CARD_FOR_TYPE[type] }).click();
}

export async function consultDate(
  page: Page,
  input: { date: string; type?: string; guests?: number },
) {
  await chooseEvent(page, input.type);
  const form = page.getByRole("form", { name: "Consultar fecha y precio" }).first();
  await expect(form).toHaveAttribute("data-ready", ""); // hidratado: si no, React descarta lo escrito
  const select = form.getByLabel("Tipo de evento");
  if (input.type && (await select.count())) await select.selectOption(input.type);
  await form.getByLabel("Fecha", { exact: true }).fill(input.date);
  if (input.guests) await form.getByLabel("Invitados", { exact: true }).fill(String(input.guests));
  await form.getByRole("button", { name: "Ver disponibilidad y precio" }).click();
}

/** Abre el paso de datos de contacto sin fecha ("¿Aún sin fecha?"). */
export async function openLeadStep(page: Page) {
  await chooseEvent(page);
  await expect(
    page.getByRole("form", { name: "Consultar fecha y precio" }).first(),
  ).toHaveAttribute("data-ready", "");
  await page
    .getByRole("button", { name: /Aún sin fecha/ })
    .first()
    .click();
  await expect(page.getByRole("form", { name: "Solicitar cotización" })).toBeVisible();
}
