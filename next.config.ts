import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: let a phone on the same Wi-Fi open the dev server by this
  // Mac's local IP (Next blocks dev assets for other origins by default).
  allowedDevOrigins: ["192.168.*.*"],
  // the resume PDF route reads its fonts and border image from disk
  outputFileTracingIncludes: {
    "/api/resume-pdf": ["./src/assets/resume-fonts/**", "./src/assets/resume-pdf/**"],
  },
};

export default nextConfig;
