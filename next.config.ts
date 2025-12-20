import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    // Explicitly pin the Turbopack project root to avoid parent lockfile resolution issues.
    root: __dirname,
  },
};

export default nextConfig;
