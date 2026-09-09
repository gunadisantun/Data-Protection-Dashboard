import { notarize } from "@electron/notarize";

export default async function notarizeMacos(context) {
  if (process.platform !== "darwin") {
    return;
  }

  const { appOutDir, electronPlatformName, packager } = context;
  if (electronPlatformName !== "darwin") {
    return;
  }

  const appName = packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    throw new Error(
      "macOS notarization requires APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID.",
    );
  }

  await notarize({
    appBundleId: packager.appInfo.appId,
    appPath,
    appleId,
    appleIdPassword,
    teamId,
  });
}
