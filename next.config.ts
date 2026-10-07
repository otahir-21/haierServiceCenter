import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  ...(process.env.VERCEL
    ? {}
    : {
        turbopack: {
          root: process.cwd(),
        },
      }),
};

export default nextConfig;
