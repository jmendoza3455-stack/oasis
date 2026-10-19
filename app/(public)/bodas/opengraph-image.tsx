import { brandOgImage, ogSize } from "@/lib/og";

export const alt = "Bodas en el campo, a tu manera · Oasis Pachacámac";
export const size = ogSize;
export const contentType = "image/png";

export default function OpengraphImage() {
  return brandOgImage("Bodas en el campo, a tu manera");
}
