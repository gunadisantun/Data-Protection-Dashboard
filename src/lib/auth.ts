import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/client";
import { ensureDatabase } from "@/db/init";
import * as schema from "@/db/schema";

ensureDatabase();

export const auth = betterAuth({
  appName: "Data Protection Governance Dashboard",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "privacyvault-local-development-secret-change-before-production",
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "PIC",
      },
      departmentId: {
        type: "string",
        required: false,
      },
    },
  },
});
