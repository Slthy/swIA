import type { NextConfig } from "next";
import { loadAnalyticsEnvironment } from "./analytics-env";

loadAnalyticsEnvironment();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // The build script runs strict `tsc --noEmit` first; avoid a redundant Next subprocess.
  typescript: { ignoreBuildErrors: true },
  experimental: { useTypeScriptCli: false },
};

export default nextConfig;
