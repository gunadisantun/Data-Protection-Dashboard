import { z } from "zod";

const dataSubjectRightsSchema = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.trim()).join("; ");
  }

  return value ?? "";
}, z.string().default(""));

const stringArraySchema = z.preprocess((value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item) => typeof item === "string" && item.trim());
}, z.array(z.string()).default([]));

export const createRopaSchema = z.object({
  activityName: z.string().trim().min(3, "minimal 3 karakter"),
  processDescription: z.string().trim().min(10, "minimal 10 karakter"),
  departmentId: z.string().trim().min(1, "wajib pilih unit kerja"),
  picName: z.string().trim().min(2, "minimal 2 karakter"),
  picEmail: z.email("format email tidak valid"),
  legalBasis: z.enum([
    "Consent",
    "Contractual",
    "Legal Obligation",
    "Legitimate Interest",
    "Vital Interest",
    "Public Interest",
  ]),
  processingPurpose: z.string().trim().min(5, "minimal 5 karakter"),
  sourceMechanism: z.string().default("Direct collection"),
  subjectCategories: z.array(z.string()).default([]),
  personalDataTypes: z.array(z.string()).default([]),
  recipients: z.string().default(""),
  processorContractLink: z.string().default(""),
  dataReceiverRole: z.string().default(""),
  isCrossBorder: z.boolean().default(false),
  destinationCountry: z.string().default(""),
  exportProtectionMechanism: z.string().default(""),
  transferMechanism: z.string().default(""),
  storageLocation: z.string().trim().default(""),
  retentionPeriod: z.string().trim().default(""),
  technicalMeasures: z.string().default(""),
  organizationalMeasures: z.string().default(""),
  dataSubjectRights: dataSubjectRightsSchema,
  riskAssessmentLevel: z.enum(["Low", "Medium", "High"]).default("Low"),
  highRiskCategories: stringArraySchema,
  riskRegisterReference: z.string().default(""),
  riskLikelihood: z.enum(["Low", "Medium", "High"]).default("Medium"),
  riskImpact: z.enum(["Low", "Medium", "High"]).default("Medium"),
  riskContext: z.string().default(""),
  existingControls: z.string().default(""),
  residualRiskLevel: z.enum(["Low", "Medium", "High"]).default("Medium"),
  riskMitigationPlan: z.string().default(""),
  volumeLevel: z.enum(["Small", "Medium", "Large"]).default("Small"),
  usesAutomatedDecisionMaking: z.boolean().default(false),
  previousProcess: z.string().default(""),
  nextProcess: z.string().default(""),
  status: z.enum(["Draft", "Active", "Archived"]).default("Active"),
  userId: z.string().optional(),
}).superRefine((value, context) => {
  if (value.subjectCategories.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["subjectCategories"],
      message: "pilih minimal 1 kategori subjek data",
    });
  }

  if (value.personalDataTypes.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["personalDataTypes"],
      message: "pilih minimal 1 jenis data pribadi",
    });
  }

  if (value.isCrossBorder && !value.destinationCountry.trim()) {
    context.addIssue({
      code: "custom",
      path: ["destinationCountry"],
      message: "wajib diisi jika ada transfer luar negeri",
    });
  }

  if (value.isCrossBorder && !value.exportProtectionMechanism.trim()) {
    context.addIssue({
      code: "custom",
      path: ["exportProtectionMechanism"],
      message: "wajib diisi jika ada transfer luar negeri",
    });
  }
});

export const updateTaskSchema = z.object({
  status: z.enum(["Todo", "In Progress", "Done"]).optional(),
  notes: z.string().optional(),
});
