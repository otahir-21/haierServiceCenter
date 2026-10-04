import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  turbopack: {
    root: "/Users/alihusnain/development/haier-service-center",
  },
};

export default nextConfig;
