import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages / Capacitor 용 정적 내보내기 → out/
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
