import { describe, expect, it } from "vitest";
import { getDesktopDownloadLinks } from "@/lib/desktop-downloads";

describe("desktop download links", () => {
  it("selects Windows and macOS installers from the latest GitHub release", async () => {
    const fetchMock = async () =>
      new Response(
        JSON.stringify({
          tag_name: "desktop-v0.2.0",
          html_url: "https://github.com/gunadisantun/Data-Protection-Dashboard/releases/tag/desktop-v0.2.0",
          published_at: "2026-09-09T01:00:00.000Z",
          assets: [
            {
              name: "Privacy-Bro-Setup-0.2.0.exe",
              browser_download_url: "https://example.com/privacy-bro.exe",
              updated_at: "2026-09-09T01:01:00.000Z",
            },
            {
              name: "Privacy-Bro-0.2.0-universal.dmg",
              browser_download_url: "https://example.com/privacy-bro.dmg",
              updated_at: "2026-09-09T01:02:00.000Z",
            },
          ],
        }),
        { status: 200 },
      );

    const links = await getDesktopDownloadLinks(fetchMock as typeof fetch);

    expect(links).toMatchObject({
      version: "0.2.0",
      windowsUrl: "https://example.com/privacy-bro.exe",
      macUrl: "https://example.com/privacy-bro.dmg",
      releaseUrl:
        "https://github.com/gunadisantun/Data-Protection-Dashboard/releases/tag/desktop-v0.2.0",
      updatedAt: "2026-09-09T01:02:00.000Z",
    });
  });
});
