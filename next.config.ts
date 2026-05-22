import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "pg"],
  webpack(config) {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname),
      "@/components": path.resolve(__dirname, "components"),
    };
    return config;
  },
  // Use default Turbopack; empty config avoids invalid keys
  turbopack: {},
};

export default nextConfig;
