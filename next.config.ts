import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: let a phone on the same Wi-Fi open the dev server by this
  // Mac's local IP (Next blocks dev assets for other origins by default).
  allowedDevOrigins: ["192.168.*.*"],
  // the resume PDF route reads its fonts and border image from disk
  outputFileTracingIncludes: {
    "/api/resume-pdf": ["./src/assets/resume-fonts/**", "./src/assets/resume-pdf/**"],
  },
  // The loader's pictures: kept in the visitor's browser, so on a revisit
  // the loader shows instantly instead of re-checking ~15 files. Fresh for a
  // day; after that the cached copy still shows at once while a new one is
  // fetched in the background (so replacing a picture reaches everyone
  // within a day or two).
  async headers() {
    const cache = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=2592000" }];
    return [
      { source: "/graphics/loader-frame/:file*", headers: cache },
      { source: "/images/:file(flying-.*|loader-.*|corner-plant.*)", headers: cache },
    ];
  },
};

export default nextConfig;
