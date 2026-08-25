import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["exceljs"],
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*.sql", "./templates/**/*"],
    "/api/**/*": ["./drizzle/**/*.sql", "./templates/**/*"],
  },
};

export default nextConfig;
