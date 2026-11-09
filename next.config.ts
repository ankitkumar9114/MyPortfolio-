import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: let a phone on the same Wi-Fi open the dev server by this
  // Mac's local IP (Next blocks dev assets for other origins by default).
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
