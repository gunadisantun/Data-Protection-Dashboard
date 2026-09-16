import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["exceljs", "@electric-sql/pglite"],
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*.sql", "./templates/**/*", ...(process.env.PRIVACY_BRO_OFFLINE === "1" ? ["./node_modules/@electric-sql/pglite/dist/**/*"] : [])],
    "/api/**/*": ["./drizzle/**/*.sql", "./templates/**/*"],
  },
};

export default nextConfig;
