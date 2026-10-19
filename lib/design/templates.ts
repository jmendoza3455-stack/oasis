import { FORMATS, type DesignSpec, type Slide } from "./spec";

// Plantillas HTML de la marca Oasis (se renderizan a PNG con Chromium). Cada bloque de texto
// lleva data-fit para que el render verifique que nada se corta.

export type Assets = {
  /** @font-face ya resueltos (data URIs) para que el render no dependa de la red. */
  fontCss: string;
  /** Isotipo claro como data URI. */
  isotipo: string;
  /** Fotos de fondo resueltas a data URI, por ruta. */
  images: Record<string, string>;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const footer = (i: number, n: number, dark: boolean) => `
  <footer class="foot ${dark ? "on-dark" : ""}">
    <span>Oasis Pachacámac</span>
    ${n > 1 ? `<span class="idx">${i + 1}/${n}</span>` : ""}
  </footer>`;

function slideHtml(s: Slide, i: number, n: number, a: Assets): string {
  switch (s.layout) {
    case "cover": {
      const bg =
        s.image && a.images[s.image]
          ? `style="background-image:linear-gradient(180deg,rgba(23,30,22,.25),rgba(23,30,22,.82)),url('${a.images[s.image]}')"`
          : "";
      return `<section class="slide dark cover ${bg ? "photo" : ""}" ${bg}>
        ${bg ? "" : `<img class="ghost" src="${a.isotipo}" alt="">`}
        <img class="iso" src="${a.isotipo}" alt="">
        <div class="stack">
          ${s.kicker ? `<p class="kicker" data-fit>${esc(s.kicker)}</p>` : ""}
          <h1 class="display" data-fit>${esc(s.title)}</h1>
          ${s.subtitle ? `<p class="sub" data-fit>${esc(s.subtitle)}</p>` : ""}
        </div>${footer(i, n, true)}</section>`;
    }
    case "text":
      return `<section class="slide light"><div class="stack">
        <h2 class="h2" data-fit>${esc(s.title)}</h2><p class="body" data-fit>${esc(s.body)}</p>
        </div>${footer(i, n, false)}</section>`;
    case "list":
      return `<section class="slide light"><div class="stack">
        <h2 class="h2" data-fit>${esc(s.title)}</h2>
        <ol class="items ${s.numbered ? "numbered" : ""}">${s.items.map((it) => `<li data-fit>${esc(it)}</li>`).join("")}</ol>
        </div>${footer(i, n, false)}</section>`;
    case "fact":
      return `<section class="slide sand"><div class="stack">
        <p class="fact display" data-fit>${esc(s.title)}</p>
        ${s.body ? `<p class="body" data-fit>${esc(s.body)}</p>` : ""}
        <p class="source" data-fit>Fuente: ${esc(s.source)}</p>
        </div>${footer(i, n, false)}</section>`;
    case "cta":
      return `<section class="slide dark cta"><img class="ghost" src="${a.isotipo}" alt=""><div class="stack center">
        <img class="iso big" src="${a.isotipo}" alt="">
        <h2 class="display" data-fit>${esc(s.title)}</h2>
        ${s.subtitle ? `<p class="sub" data-fit>${esc(s.subtitle)}</p>` : ""}
        </div>${footer(i, n, true)}</section>`;
  }
}

export function designHtml(spec: DesignSpec, a: Assets): string {
  const { width: W, height: H } = FORMATS[spec.format];
  const scale = W / 1080;
  const px = (v: number) => `${Math.round(v * scale)}px`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
  ${a.fontCss}
  :root { --green:#2e3b2b; --ivory:#f7f5f0; --sand:#e6dccb; --camel:#c9a46c; --ink:#2a2f29; --muted:#5d5f58; }
  * { box-sizing: border-box; margin: 0; }
  body { background: #000; }
  .slide { width:${W}px; height:${H}px; position:relative; overflow:hidden; padding:${px(96)} ${px(88)} ${px(150)};
           display:flex; flex-direction:column; justify-content:center; font-family:"Figtree SemiBold",sans-serif; }
  .dark { background: var(--green); color: var(--ivory); }
  .light { background: var(--ivory); color: var(--ink); }
  .sand { background: var(--sand); color: var(--green); }
  .photo { background-size: cover; background-position: center; justify-content: flex-end; }
  .stack { display:flex; flex-direction:column; gap:${px(36)}; max-height:100%; }
  .center { align-items:center; text-align:center; }
  .display { font-family:"Cormorant Garamond SemiBold",serif; font-size:${px(104)}; line-height:1.02; letter-spacing:-.01em; text-wrap:balance; }
  .h2 { font-family:"Cormorant Garamond SemiBold",serif; font-size:${px(86)}; line-height:1.05; color:var(--green); text-wrap:balance; }
  .kicker { font-family:"Figtree ExtraBold",sans-serif; font-size:${px(34)}; letter-spacing:.16em; text-transform:uppercase; color:var(--camel); }
  .sub { font-size:${px(44)}; line-height:1.3; color: var(--sand); }
  .body { font-size:${px(46)}; line-height:1.4; max-width:30ch; }
  .items { list-style:none; padding:0; display:grid; gap:${px(26)}; }
  .items li { font-size:${px(46)}; line-height:1.3; padding-left:${px(64)}; position:relative; }
  .items li::before { content:""; position:absolute; left:0; top:${px(18)}; width:${px(26)}; height:${px(26)}; border-radius:50%; background:var(--camel); }
  .items.numbered { counter-reset:n; }
  .items.numbered li::before { counter-increment:n; content:counter(n); width:auto; height:auto; top:0; background:none;
     font-family:"Cormorant Garamond SemiBold",serif; font-size:${px(56)}; color:var(--camel); }
  .fact { font-size:${px(150)}; line-height:1; }
  .source { font-size:${px(30)}; color: var(--muted); }
  .iso { position:absolute; top:${px(80)}; left:${px(88)}; width:${px(96)}; height:${px(96)}; }
  .ghost { position:absolute; right:${px(-140)}; bottom:${px(-80)}; width:${px(760)}; opacity:.07; pointer-events:none; }
  .stack, .iso, .foot { z-index:1; }
  .iso.big { position:static; width:${px(220)}; height:${px(220)}; }
  .foot { position:absolute; left:${px(88)}; right:${px(88)}; bottom:${px(64)}; display:flex; justify-content:space-between;
          font-size:${px(28)}; color: var(--muted); }
  .foot.on-dark { color: rgba(247,245,240,.72); }
  .foot b { font-family:"Figtree ExtraBold",sans-serif; font-weight:normal; }
  </style></head><body>${spec.slides.map((s, i) => slideHtml(s, i, spec.slides.length, a)).join("")}</body></html>`;
}
