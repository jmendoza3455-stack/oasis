import { brandOgImage, ogSize } from "@/lib/og";

export const alt = "Programa de planners aliadas · Oasis Pachacámac";
export const size = ogSize;
export const contentType = "image/png";

export default function OpengraphImage() {
  return brandOgImage("Programa de planners aliadas");
}
