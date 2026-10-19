import { ImageResponse } from "next/og";

// Imagen para compartir (WhatsApp, Facebook, LinkedIn) con la marca y el título de cada página.
export const ogSize = { width: 1200, height: 630 };

export function brandOgImage(title?: string) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#2E3B2B",
        color: "#E6DCCB",
        fontFamily: "serif",
        padding: 60,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: title ? 56 : 96, letterSpacing: title ? 12 : 18 }}>
        OASIS PACHACÁMAC
      </div>
      <div style={{ marginTop: 26, width: 420, height: 2, background: "#C9A46C" }} />
      {title && <div style={{ marginTop: 34, fontSize: 64, lineHeight: 1.15 }}>{title}</div>}
      <div style={{ marginTop: 30, fontSize: 32, fontFamily: "sans-serif", color: "#E6DCCBCC" }}>
        Un espacio sawa · Pachacámac, Lima
      </div>
    </div>,
    ogSize,
  );
}
