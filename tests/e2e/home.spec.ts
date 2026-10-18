import { expect, test } from "@playwright/test";

test("la home carga en español y se captura", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "es-PE");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({
    path: `test-results/screenshots/home-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
