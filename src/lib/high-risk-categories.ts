export const highRiskCategoryOptions = [
  {
    id: "automated-legal-significant-effect",
    code: "a",
    shortLabel: "Keputusan otomatis berdampak signifikan",
    label:
      "Pengambilan keputusan secara otomatis yang memiliki akibat hukum atau dampak yang signifikan terhadap Subjek Data Pribadi",
  },
  {
    id: "specific-personal-data",
    code: "b",
    shortLabel: "Data Pribadi spesifik",
    label: "Pemrosesan atas Data Pribadi yang bersifat spesifik",
  },
  {
    id: "large-scale-processing",
    code: "c",
    shortLabel: "Pemrosesan skala besar",
    label: "Pemrosesan Data Pribadi dalam skala besar",
  },
  {
    id: "systematic-evaluation-scoring-monitoring",
    code: "d",
    shortLabel: "Evaluasi, penskoran, atau pemantauan sistematis",
    label:
      "Pemrosesan Data Pribadi untuk kegiatan evaluasi, penskoran, atau pemantauan yang sistematis terhadap Subjek Data Pribadi",
  },
  {
    id: "data-matching-combination",
    code: "e",
    shortLabel: "Pencocokan atau penggabungan data",
    label:
      "Pemrosesan Data Pribadi untuk kegiatan pencocokan atau penggabungan sekelompok data",
  },
  {
    id: "new-technology",
    code: "f",
    shortLabel: "Teknologi baru",
    label: "Penggunaan teknologi baru dalam pemrosesan Data Pribadi",
  },
  {
    id: "restricts-data-subject-rights",
    code: "g",
    shortLabel: "Pembatasan hak Subjek Data Pribadi",
    label:
      "Pemrosesan Data Pribadi yang membatasi pelaksanaan hak Subjek Data Pribadi",
  },
] as const;

export type HighRiskCategoryId = (typeof highRiskCategoryOptions)[number]["id"];

export function getHighRiskCategoryLabel(value: string) {
  return (
    highRiskCategoryOptions.find((category) => category.id === value)?.label ?? value
  );
}

export function getHighRiskCategoryShortLabel(value: string) {
  return (
    highRiskCategoryOptions.find((category) => category.id === value)?.shortLabel ??
    value
  );
}

export function hasHighRiskCategory(
  categories: readonly string[] | null | undefined,
  id: HighRiskCategoryId,
) {
  return Boolean(categories?.includes(id));
}
