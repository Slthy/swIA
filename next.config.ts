import type { NextConfig } from "next";
import { loadAnalyticsEnvironment } from "./analytics-env";

const analyticsEnvironment = loadAnalyticsEnvironment();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // These criteria are non-secret and must be available inside Vercel serverless functions.
  env: analyticsEnvironment,
  // The build script runs strict `tsc --noEmit` first; avoid a redundant Next subprocess.
  typescript: { ignoreBuildErrors: true },
  experimental: { useTypeScriptCli: false },
};

export default nextConfig;
