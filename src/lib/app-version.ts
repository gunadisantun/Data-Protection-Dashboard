import packageJson from "../../package.json";

export function getAppVersion() {
  return (
    process.env.DESKTOP_APP_VERSION?.trim() ||
    process.env.NEXT_PUBLIC_APP_VERSION?.trim() ||
    packageJson.version
  );
}
