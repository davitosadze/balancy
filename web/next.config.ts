import type { NextConfig } from "next";

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? "http://localhost:8055";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/directus/:path*",
        destination: `${DIRECTUS_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
