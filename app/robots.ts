import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/content/seo";

export default function robots(): MetadataRoute.Robots {
  // Previews de Vercel nunca se indexan
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/planners/portal", "/ingresar", "/auth"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
