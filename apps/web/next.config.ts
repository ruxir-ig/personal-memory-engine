import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ["@pme/shared"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
