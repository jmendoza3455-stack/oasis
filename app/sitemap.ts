import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/content/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "/bodas",
    "/corporativo",
    "/full-day",
    "/planners",
    "/libro-de-reclamaciones",
    "/privacidad",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
