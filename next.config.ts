import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  serverExternalPackages: ["better-sqlite3", "oracledb"],
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;
