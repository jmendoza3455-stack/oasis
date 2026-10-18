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
