import { PrivacyRegulatoryMap } from "@/components/privacy-map/PrivacyRegulatoryMap";
import { requireViewer } from "@/lib/access";
import type { PrivacyMapDataset } from "@/lib/privacy-map/types";
import { privacyMapWorkbookData } from "@/lib/privacy-map/workbook-data";

export const dynamic = "force-dynamic";

export default async function PrivacyMapPage() {
  const viewer = await requireViewer();
  const displayDataset = sanitizePrivacyMapDataset(privacyMapWorkbookData);

  return (
    <div className="mx-auto max-w-[1500px]">
      <PrivacyRegulatoryMap
        dataset={displayDataset}
        viewerRole={viewer.role}
      />
    </div>
  );
}

function sanitizePrivacyMapDataset(dataset: PrivacyMapDataset): PrivacyMapDataset {
  return {
    lastGenerated: dataset.lastGenerated,
    euBenchmark: dataset.euBenchmark,
    legalVariables: dataset.legalVariables,
    jurisdictions: dataset.jurisdictions.map((item) => {
      const jurisdiction = { ...item };
      delete jurisdiction.sourceLibrary;
      jurisdiction.sourceUrls = isSafeMainLawUrl(item.sourceUrls?.primary)
        ? { primary: item.sourceUrls?.primary }
        : undefined;
      return jurisdiction;
    }),
    mappings: dataset.mappings.map((item) => {
      const mapping = { ...item };
      delete mapping.sourceUrl;
      return mapping;
    }),
    regulatoryChanges: dataset.regulatoryChanges.map((item) => {
      const change = { ...item };
      delete change.sourceName;
      delete change.sourceUrl;
      return change;
    }),
  };
}

function isSafeMainLawUrl(url: string | undefined) {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  return !/dla\s*piper|dlapiperdataprotection/i.test(url);
}
