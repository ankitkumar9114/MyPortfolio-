import type { MetadataRoute } from "next";

// /sitemap.xml: the site's public pages.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.ankitux.co.in";
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/resume`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
