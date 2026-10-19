import { brandOgImage, ogSize } from "@/lib/og";

export const alt = "Full days y team building para empresas · Oasis Pachacámac";
export const size = ogSize;
export const contentType = "image/png";

export default function OpengraphImage() {
  return brandOgImage("Full days y team building para empresas");
}
