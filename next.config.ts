import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  ...(process.env.VERCEL
    ? {}
    : {
        turbopack: {
          root: process.cwd(),
        },
      }),
};

export default nextConfig;
