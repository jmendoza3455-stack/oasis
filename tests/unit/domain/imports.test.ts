import { describe, expect, it } from "vitest";
import {
  aggregateCampaignSpend,
  csvRecords,
  normalizeHeader,
  parseAmount,
  parseCsv,
  parseFlexibleDate,
  parseHistoricalEvents,
  toCsv,
} from "@/lib/domain";

describe("csv", () => {
  it("parsea comillas, comas internas, punto y coma y BOM", () => {
    expect(parseCsv('﻿a,b\n"x, y","say ""hi"""\r\n\n3,4')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
      ["3", "4"],
    ]);
    expect(parseCsv("a;b\n1;2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(csvRecords("Nombre de la campaña;Importe gastado\nX;10")).toEqual([
      { nombre_de_la_campana: "X", importe_gastado: "10" },
    ]);
    expect(csvRecords("")).toEqual([]);
    expect(normalizeHeader(" Amount spent (PEN) ")).toBe("amount_spent_pen");
  });

  it("genera CSV con BOM y escapes", () => {
    const out = toCsv(
      [{ a: 'x,"y"', b: null }],
      [
        { key: "a", label: "A" },
        { key: "b", label: "B" },
      ],
    );
    expect(out).toBe('﻿A,B\r\n"x,""y""",\r\n');
  });

  it("fechas y montos en formatos peruanos e ingleses", () => {
    expect(parseFlexibleDate("17/12/2026")).toBe("2026-12-17");
    expect(parseFlexibleDate("2026-12-17")).toBe("2026-12-17");
    expect(parseFlexibleDate("31/02/2026")).toBeNull();
    expect(parseFlexibleDate("ayer")).toBeNull();
    expect(parseAmount("S/ 1.234,50")).toBe(1234.5);
    expect(parseAmount("1,234.50")).toBe(1234.5);
    expect(parseAmount("2,200")).toBe(2200);
    expect(parseAmount("12,5")).toBe(12.5);
    expect(parseAmount("1.234")).toBe(1234);
    expect(parseAmount("99.90")).toBe(99.9);
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("importación de inversión de campañas", () => {
  it("agrupa por campaña y mes (export de Meta en español)", () => {
    const recs = csvRecords(
      "Nombre de la campaña,Inicio del informe,Importe gastado (PEN),Impresiones,Clics en el enlace\n" +
        "fd-verano-meta,2026-12-01,300.50,10000,200\nfd-verano-meta,2026-12-15,200,8000,150\nsearch,2026-11-03,50,100,5\n,2026-12-01,10,1,1",
    );
    const { rows, errors } = aggregateCampaignSpend(recs);
    expect(rows).toContainEqual({
      campaign: "fd-verano-meta",
      month: "2026-12-01",
      amount: 500.5,
      impressions: 18000,
      clicks: 350,
    });
    expect(rows).toHaveLength(2);
    expect(errors).toEqual(["Fila 5: falta campaña, monto o fecha."]);
  });

  it("acepta exportes de Google con mes AAAA-MM", () => {
    const { rows } = aggregateCampaignSpend(
      csvRecords("Campaign,Month,Cost\nsearch-eventos,2026-12,1,250.00"),
    );
    expect(rows[0]).toMatchObject({ campaign: "search-eventos", month: "2026-12-01" });
  });
});

describe("importación de eventos históricos", () => {
  it("valida filas y rechaza fechas futuras o tipos desconocidos", () => {
    const recs = csvRecords(
      "fecha,tipo,invitados,canal,monto_sin_igv,cliente,telefono,correo\n" +
        "15/02/2026,Boda,120,directo,4500,Ana,999,ana@x.pe\n" +
        "15/02/2027,boda,120,directo,4500,Beto,,\n" +
        "10/03/2026,fiesta,50,,1000,Caro,,\n" +
        '11/03/2026,full day,40,Referido,"2,200",Dani,,\n' +
        "12/03/2026,corporativo,40,planner,2000,Eva,,",
    );
    const { ok, errors } = parseHistoricalEvents(recs, "2026-10-18");
    expect(ok.map((e) => [e.clientName, e.eventType, e.channel, e.listNet])).toEqual([
      ["Ana", "wedding", "direct", 4500],
      ["Dani", "family_day", "referral", 2200],
    ]);
    expect(errors).toHaveLength(3);
    expect(errors[0]).toMatch(/Fila 3: la fecha debe ser pasada/);
    expect(errors[1]).toMatch(/tipo desconocido/);
    expect(errors[2]).toMatch(/planner/);
  });
});
