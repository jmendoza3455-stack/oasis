import { ImageResponse } from "next/og";

export const alt = "Oasis Pachacámac · Un espacio SAWA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
      }}
    >
      <div style={{ fontSize: 96, letterSpacing: 18 }}>OASIS</div>
      <div style={{ fontSize: 96, letterSpacing: 18 }}>PACHACÁMAC</div>
      <div style={{ marginTop: 30, width: 420, height: 2, background: "#E6DCCB88" }} />
      <div style={{ marginTop: 30, fontSize: 36, fontFamily: "sans-serif" }}>Un espacio sawa</div>
    </div>,
    size,
  );
}
