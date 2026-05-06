import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { resetAndSeedDatabase } = await import("@/db/init");
  const { queryClient } = await import("@/db/client");
  await resetAndSeedDatabase();
  console.log("PrivacyVault seed data refreshed.");
  await queryClient.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
