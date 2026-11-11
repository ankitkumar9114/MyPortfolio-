import type { MetadataRoute } from "next";

// /robots.txt: the public site is crawlable; API routes aren't. (The CMS is
// deliberately NOT listed here — that would publish its hidden address; its
// pages carry their own "noindex" instead.)
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: "https://www.ankitux.co.in/sitemap.xml",
    host: "https://www.ankitux.co.in",
  };
}
