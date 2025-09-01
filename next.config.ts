import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    outputFileTracingExcludes: {
      "*": [
        "**/.git/**",
        "**/.next/cache/**",
        "public/images/**",
        "public/brand/**",
        "public/starter-pack.pdf",
      ],
    },
  },
};

export default nextConfig;
