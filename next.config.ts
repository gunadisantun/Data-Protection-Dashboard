import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone is required by the Electron bundle, but Vercel's build
  // finalizer expects the standard Next.js output for web deployments.
  output: process.env.VERCEL ? undefined : "standalone",
  serverExternalPackages: ["exceljs", "@electric-sql/pglite"],
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*.sql", "./templates/**/*", ...(process.env.PRIVACY_BRO_OFFLINE === "1" ? ["./node_modules/@electric-sql/pglite/dist/**/*"] : [])],
    "/api/**/*": ["./drizzle/**/*.sql", "./templates/**/*"],
  },
};

export default nextConfig;
