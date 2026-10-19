import { describe, expect, it } from "vitest";
import {
  adsReport,
  anonymizeChat,
  competitorReport,
  csvRecords,
  isoDate,
  median,
  parseCsv,
  parseWhatsappExport,
  trendsSeasonality,
  vocSummary,
} from "@/lib/marketing/ingest";

// Todos los datos de estas pruebas son inventados (nombres, números y correos ficticios).

describe("CSV", () => {
  it("respeta comillas, comas y saltos de línea dentro de un campo", () => {
    expect(parseCsv('a,b\n"x, y","línea 1\nlínea 2"\n"con ""comillas""",3\r\n')).toEqual([
      ["a", "b"],
      ["x, y", "línea 1\nlínea 2"],
      ['con "comillas"', "3"],
    ]);
    expect(csvRecords("﻿Competidor,Me gusta\nLa Huerta,1.2k")).toEqual([
      { competidor: "La Huerta", me_gusta: "1.2k" },
    ]);
  });

  it("fechas y medianas", () => {
    expect(isoDate("5/1/27")).toBe("2027-01-05");
    expect(isoDate("2026-10-19")).toBe("2026-10-19");
    expect(isoDate("ayer")).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe("WhatsApp exportado", () => {
  const android = `19/10/26, 9:15 a. m. - Los mensajes y las llamadas están cifrados de extremo a extremo.
19/10/26, 9:15 a. m. - Rosa Quispe Ficticia: Hola buenas, quería saber el precio para un matrimonio de 120 personas
en diciembre
19/10/26, 9:20 a. m. - Carlos Oasis: Hola Rosa, claro. ¿Qué fecha tienen en mente?
19/10/26, 2:05 p. m. - Rosa Quispe Ficticia: El sábado 12. Mi cel es 987 654 321 y mi correo rosa.ficticia@example.com
19/10/26, 2:06 p. m. - Rosa Quispe Ficticia: <Multimedia omitido>`;
  const ios = `[19/10/26, 21:03:11] Oasis Pachacámac: ¡Hola! Gracias por escribir.
[19/10/26, 21:04:02] +51 912 345 678: ¿Tienen piscina y se puede dormir ahí? Mi DNI 12345678 para la reserva`;

  it("lee Android (12 h, multilínea, mensajes de sistema) e iPhone", () => {
    const a = parseWhatsappExport(android);
    expect(a).toHaveLength(4);
    expect(a[0]).toMatchObject({
      date: "2026-10-19",
      time: "09:15",
      author: "Rosa Quispe Ficticia",
    });
    expect(a[0].text).toBe(
      "Hola buenas, quería saber el precio para un matrimonio de 120 personas\nen diciembre",
    );
    expect(a[2].time).toBe("14:05");
    const i = parseWhatsappExport(ios);
    expect(i.map((m) => [m.time, m.author])).toEqual([
      ["21:03", "Oasis Pachacámac"],
      ["21:04", "+51 912 345 678"],
    ]);
  });

  it("anonimiza autores, nombres, celulares, correos y DNI", () => {
    const a = anonymizeChat(parseWhatsappExport(android), ["Carlos", "Oasis"]);
    expect(a.map((m) => m.author)).toEqual(["Cliente 1", "Oasis", "Cliente 1", "Cliente 1"]);
    expect(a[1].text).toBe("Hola [nombre], claro. ¿Qué fecha tienen en mente?");
    expect(a[2].text).toBe("El sábado 12. Mi cel es [celular] y mi correo [correo]");
    expect(a[3].text).toBe("[adjunto]");
    const i = anonymizeChat(parseWhatsappExport(ios), ["Oasis"]);
    expect(i.map((m) => m.author)).toEqual(["Oasis", "Cliente 1"]);
    expect(i[1].text).toContain("Mi DNI [dni]");
    expect(JSON.stringify([a, i])).not.toMatch(/Rosa|Quispe|987|912|example\.com|12345678/);
  });

  it("resume los temas que tocan los clientes y sus primeras frases", () => {
    const chats = [
      anonymizeChat(parseWhatsappExport(android), ["Carlos"]),
      anonymizeChat(parseWhatsappExport(ios), ["Oasis"]),
    ];
    const s = vocSummary(chats);
    expect(s.chats).toBe(2);
    expect(s.clientMessages).toBe(3);
    const topic = (t: string) => s.topics.find((x) => x.topic === t)?.chats;
    expect(topic("precio")).toBe(1);
    expect(topic("capacidad")).toBe(1);
    expect(topic("piscina")).toBe(1);
    expect(topic("hospedaje")).toBe(1);
    expect(s.openers[0]).toMatch(/^Hola buenas, quería saber el precio/);
  });
});

describe("Google Trends", () => {
  const csv = `Categoría: Todas las categorías

Semana,local para eventos: (Perú),casa de campo: (Perú)
2025-01-05,80,40
2025-01-12,100,60
2025-06-01,20,<1
2025-12-07,90,50
2026-01-04,60,40`;

  it("convierte semanas en un índice mensual (100 = promedio)", () => {
    const s = trendsSeasonality(csv);
    expect(s.terms).toEqual(["local para eventos", "casa de campo"]);
    const m = (n: number) => s.months[n - 1].values;
    // Promedio de enero = 80, junio = 20, diciembre = 90 → media 63.3
    expect(m(1)["local para eventos"]).toBe(126);
    expect(m(6)["local para eventos"]).toBe(32);
    expect(m(3)["local para eventos"]).toBeNull();
    expect(m(6)["casa de campo"]).toBe(2); // "<1" cuenta como 0.5 (0.5 / 32.4)
    expect(s.peaks["local para eventos"]).toEqual([12, 1, 6]);
  });

  it("avisa si el archivo no es de Trends", () => {
    expect(() => trendsSeasonality("a,b\n1,2")).toThrow(/cabecera/);
  });
});

describe("competencia y anuncios", () => {
  it("medianas de interacciones por competidor, formato y tema", () => {
    const r = competitorReport(`competidor,fecha,formato,url,me_gusta,comentarios,vistas,tema
Local A,01/10/26,Reel,https://x/1,1.2k,30,20k,boda
Local A,03/10/26,Carrusel,https://x/2,200,10,,precio
Local A,05/10/26,Reel,https://x/3,800,20,9k,boda
Local B,02/10/26,reel,https://x/4,90,5,,quinceañero`);
    expect(r.rows).toBe(4);
    expect(r.byCompetitor[0]).toMatchObject({
      competitor: "Local A",
      posts: 3,
      medianInteractions: 820,
    });
    expect(r.byCompetitor[0].byFormat[0]).toEqual({
      format: "reel",
      posts: 2,
      medianInteractions: 1025,
    });
    expect(r.byCompetitor[0].top[0]).toMatchObject({ interactions: 1230, url: "https://x/1" });
    expect(r.byTopic[0]).toEqual({ topic: "boda", posts: 2, medianInteractions: 1025 });
  });

  it("anuncios activos 21+ días = los que probablemente rinden", () => {
    const r = adsReport(
      `anunciante,inicio,fin,activo,plataformas,formato,texto,cta,url
Local A,2026-09-01,,sí,IG+FB,video,"Separa tu fecha de verano, cupos limitados",Enviar mensaje,https://x
Local A,2026-10-10,2026-10-15,no,IG,imagen,Promo boda,Más información,https://y
Local B,2026-09-20,2026-10-12,no,FB,carrusel,Full day,Enviar mensaje,https://z`,
      "2026-10-19",
    );
    expect(r.byAdvertiser[0]).toMatchObject({
      advertiser: "Local A",
      ads: 2,
      active: 1,
      winners: 1,
    });
    expect(r.winners.map((w) => [w.advertiser, w.days])).toEqual([
      ["Local A", 49],
      ["Local B", 23],
    ]);
    expect(r.byAdvertiser[0].ctas).toEqual({ "Enviar mensaje": 1, "Más información": 1 });
  });
});
