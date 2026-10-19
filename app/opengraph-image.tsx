import { brandOgImage, ogSize } from "@/lib/og";

export const alt = "Oasis Pachacámac · Un espacio SAWA";
export const size = ogSize;
export const contentType = "image/png";

export default function OpengraphImage() {
  return brandOgImage();
}
