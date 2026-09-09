export type DesktopDownloadLinks = {
  version: string | null;
  windowsUrl: string | null;
  macUrl: string | null;
  releaseUrl: string | null;
  updatedAt: string | null;
};

type GitHubReleaseAsset = {
  name?: string;
  browser_download_url?: string;
  updated_at?: string;
};

type GitHubRelease = {
  tag_name?: string;
  html_url?: string;
  published_at?: string;
  assets?: GitHubReleaseAsset[];
};

const defaultRepository = "gunadisantun/Data-Protection-Dashboard";

export async function getDesktopDownloadLinks(
  fetchImpl: typeof fetch = fetch,
): Promise<DesktopDownloadLinks> {
  const envLinks = getEnvDesktopDownloadLinks();
  if (envLinks.windowsUrl || envLinks.macUrl) {
    return envLinks;
  }

  const repository = process.env.DESKTOP_RELEASE_REPOSITORY || defaultRepository;
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_RELEASE_TOKEN;

  try {
    const response = await fetchImpl(`https://api.github.com/repos/${repository}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "PrivacyBroDesktopDownloadResolver/1.0",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      next: { revalidate: 300 },
    } as RequestInit);

    if (!response.ok) {
      return envLinks;
    }

    const release = (await response.json()) as GitHubRelease;
    const assets = release.assets ?? [];
    const windowsAsset = findDesktopAsset(assets, [".exe"]);
    const macAsset = findDesktopAsset(assets, [".dmg"]);

    return {
      version: cleanReleaseVersion(release.tag_name) ?? envLinks.version,
      windowsUrl: windowsAsset?.browser_download_url ?? null,
      macUrl: macAsset?.browser_download_url ?? null,
      releaseUrl: release.html_url ?? null,
      updatedAt:
        latestDate([release.published_at, windowsAsset?.updated_at, macAsset?.updated_at]) ??
        envLinks.updatedAt,
    };
  } catch {
    return envLinks;
  }
}

function getEnvDesktopDownloadLinks(): DesktopDownloadLinks {
  return {
    version: process.env.DESKTOP_APP_VERSION || null,
    windowsUrl: process.env.DESKTOP_WINDOWS_URL || null,
    macUrl: process.env.DESKTOP_MAC_URL || null,
    releaseUrl: process.env.DESKTOP_RELEASE_URL || null,
    updatedAt: process.env.DESKTOP_RELEASE_UPDATED_AT || null,
  };
}

function findDesktopAsset(assets: GitHubReleaseAsset[], extensions: string[]) {
  return assets.find((asset) => {
    const name = asset.name?.toLowerCase() ?? "";
    const url = asset.browser_download_url?.toLowerCase() ?? "";
    return extensions.some((extension) => name.endsWith(extension) || url.endsWith(extension));
  });
}

function cleanReleaseVersion(tagName?: string) {
  if (!tagName) {
    return null;
  }
  return tagName.replace(/^desktop-v?/i, "");
}

function latestDate(values: Array<string | undefined>) {
  const dates = values
    .map((value) => (value ? new Date(value) : null))
    .filter((value): value is Date => Boolean(value && !Number.isNaN(value.getTime())))
    .sort((a, b) => b.getTime() - a.getTime());

  return dates[0]?.toISOString() ?? null;
}
