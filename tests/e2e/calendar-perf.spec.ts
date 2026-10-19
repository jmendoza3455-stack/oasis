import { writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { calendarReady } from "./helpers";

// Laboratorio: Android de gama media (CPU 4× más lenta) en "4G lento" (150 ms RTT, 1.6 Mbps).
// Mide la duración de cada interacción con la Event Timing API (base de INP) al usar el
// calendario: cambiar de mes y tocar días. El INP de campo se verá en Vercel Speed Insights.

type W = Window & { __events?: { id: number; name: string; duration: number }[] };

test("calendario: interacción más lenta < 200 ms en móvil de gama media con 4G", async ({
  page,
  isMobile,
}, info) => {
  test.skip(!isMobile, "Perfil móvil");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await page.addInitScript(() => {
    const w = window as W;
    w.__events = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEventTiming & {
        interactionId?: number;
      })[]) {
        if (e.interactionId)
          w.__events!.push({ id: e.interactionId, name: e.name, duration: e.duration });
      }
    }).observe({ type: "event", durationThreshold: 16, buffered: true } as PerformanceObserverInit);
  });

  await page.goto("/bodas", { waitUntil: "networkidle" });
  const cal = await calendarReady(page);
  for (let i = 0; i < 3; i++) {
    await cal.getByRole("button", { name: "Mes siguiente" }).click();
    await calendarReady(page);
  }
  await cal.getByRole("button", { name: "Mes anterior" }).click();
  await calendarReady(page);
  const free = cal.locator('button[data-status="free"]');
  for (let i = 0; i < 3; i++) {
    await free.nth(i * 3).click();
    await expect(page.getByText(/está libre!|se acaba de ocupar/)).toBeVisible();
  }
  await page.waitForTimeout(500);

  const events = await page.evaluate(() => (window as W).__events ?? []);
  const perInteraction = new Map<number, number>();
  for (const e of events)
    perInteraction.set(e.id, Math.max(perInteraction.get(e.id) ?? 0, e.duration));
  const durations = [...perInteraction.values()].sort((a, b) => b - a);
  const worst = durations[0] ?? 0;
  const report = { interactions: 7, measuredOver16ms: durations.length, worstMs: worst, durations };
  writeFileSync("test-results/calendar-inp.json", JSON.stringify(report, null, 2));
  await info.attach("inp", {
    body: JSON.stringify(report, null, 2),
    contentType: "application/json",
  });
  expect(worst).toBeLessThan(200);
});
