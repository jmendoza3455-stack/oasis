import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/content/seo";
import { venueInfo } from "@/server/public/venue-info";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { pricesEnabled } = await venueInfo();
  return [
    "",
    "/bodas",
    "/corporativo",
    "/full-day",
    ...(pricesEnabled ? ["/precios"] : []),
    "/planners",
    "/libro-de-reclamaciones",
    "/privacidad",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
