import { z } from "zod";
import { breachReportSections } from "@/lib/breach-report-fields";
import {
  selfAssessmentActionStatusValues,
  selfAssessmentAnswerValues,
  selfAssessmentKindValues,
  selfAssessmentPriorityValues,
  selfAssessmentStatusValues,
} from "@/lib/self-assessment";
import {
  configurableModuleValues,
  moduleCustomColumnInputTypeValues,
} from "@/lib/module-columns";

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

const transferItemsSchema = z.preprocess((value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value;
}, z.array(z.object({
  transferPurpose: z.string().default(""),
  recipients: z.string().default(""),
  dataReceiverRole: z.string().default(""),
  isCrossBorder: z.boolean().default(false),
  destinationCountry: z.string().default(""),
  exportProtectionMechanism: z.string().default(""),
})).default([]));

export const createRopaSchema = z.object({
  activityName: z.string().trim().min(3, "minimal 3 karakter"),
  processDescription: z.string().trim().min(10, "minimal 10 karakter"),
  departmentId: z.string().trim().min(1, "wajib pilih unit kerja"),
  picName: z.string().optional().default(""),
  picEmail: z.string().optional().default(""),
  controllerProcessorContacts: z.string().optional().default(""),
  dpoContact: z.string().optional().default(""),
  legalBasis: z.enum([
    "Consent",
    "Contractual",
    "Legal Obligation",
    "Legitimate Interest",
    "Vital Interest",
    "Public Interest",
  ]),
  processingPurpose: z.string().trim().min(5, "minimal 5 karakter"),
  hasTransfer: z.boolean().default(false),
  transferPurpose: z.string().default(""),
  sourceMechanism: z.string().trim().min(5, "minimal 5 karakter"),
  subjectCategories: z.array(z.string()).default([]),
  personalDataTypes: z.array(z.string()).default([]),
  recipients: z.string().default(""),
  processorContractLink: z.string().default(""),
  dataReceiverRole: z.string().default(""),
  isCrossBorder: z.boolean().default(false),
  destinationCountry: z.string().default(""),
  exportProtectionMechanism: z.string().default(""),
  transferMechanism: z.string().default(""),
  storageLocation: z.string().trim().min(3, "minimal 3 karakter"),
  retentionPeriod: z.string().trim().min(3, "minimal 3 karakter"),
  technicalMeasures: z.string().trim().min(3, "minimal 3 karakter"),
  organizationalMeasures: z.string().trim().min(3, "minimal 3 karakter"),
  dataSubjectRights: dataSubjectRightsSchema.refine(
    (value) => value.trim().length > 0,
    "pilih minimal 1 hak subjek data pribadi",
  ),
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
  dataFlowMapping: z.string().default(""),
  previousProcess: z.string().default(""),
  nextProcess: z.string().default(""),
  status: z.enum(["Draft", "Active", "Archived"]).default("Active"),
  userId: z.string().optional(),
  transferItems: transferItemsSchema,
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

  if (value.hasTransfer) {
    const transferItems = value.transferItems.length
      ? value.transferItems
      : [
          {
            transferPurpose: value.transferPurpose,
            recipients: value.recipients,
            dataReceiverRole: value.dataReceiverRole,
            isCrossBorder: value.isCrossBorder,
            destinationCountry: value.destinationCountry,
            exportProtectionMechanism: value.exportProtectionMechanism,
          },
        ];

    if (transferItems.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["transferItems"],
        message: "tambahkan minimal 1 pengiriman data pribadi",
      });
    }

    transferItems.forEach((item, index) => {
      if (item.transferPurpose.trim().length < 5) {
        context.addIssue({
          code: "custom",
          path: ["transferItems", index, "transferPurpose"],
          message: "minimal 5 karakter",
        });
      }

      if (item.recipients.trim().length < 3) {
        context.addIssue({
          code: "custom",
          path: ["transferItems", index, "recipients"],
          message: "minimal 3 karakter",
        });
      }

      if (!item.dataReceiverRole.trim()) {
        context.addIssue({
          code: "custom",
          path: ["transferItems", index, "dataReceiverRole"],
          message: "wajib pilih jenis transfer",
        });
      }

      if (item.isCrossBorder && !item.destinationCountry.trim()) {
        context.addIssue({
          code: "custom",
          path: ["transferItems", index, "destinationCountry"],
          message: "wajib diisi jika ada transfer luar negeri",
        });
      }

      if (item.isCrossBorder && !item.exportProtectionMechanism.trim()) {
        context.addIssue({
          code: "custom",
          path: ["transferItems", index, "exportProtectionMechanism"],
          message: "wajib diisi jika ada transfer luar negeri",
        });
      }
    });
  }
});

export const updateTaskSchema = z.object({
  status: z.enum(["Todo", "In Progress", "Done"]).optional(),
  notes: z.string().optional(),
});

export const riskRegisterCreateSchema = z.object({
  riskId: z.string().trim().min(1, "riskId wajib diisi"),
  riskDescription: z.string().trim().min(5, "riskDescription minimal 5 karakter"),
  potentialImpact: z.string().trim().min(5, "potentialImpact minimal 5 karakter"),
  existingControl: z.string().trim().min(3, "existingControl minimal 3 karakter"),
  riskLevel: z.enum(["Low", "Medium", "High"]),
  recommendedAction: z.string().trim().min(3, "recommendedAction minimal 3 karakter"),
  riskOwner: z.string().trim().min(2, "riskOwner minimal 2 karakter"),
  targetDate: z.string().trim().min(4, "targetDate wajib diisi"),
  status: z.enum(["Open", "In Progress", "Closed"]),
  remarks: z.string().optional(),
  sourceAssessmentId: z.string().optional(),
  sourceRopaId: z.string().optional(),
  departmentId: z.string().optional(),
  activityName: z.string().optional(),
});

export const riskRegisterUpdateSchema = z.object({
  riskId: z.string().trim().min(1, "riskId wajib diisi").optional(),
  riskDescription: z
    .string()
    .trim()
    .min(5, "riskDescription minimal 5 karakter")
    .optional(),
  potentialImpact: z
    .string()
    .trim()
    .min(5, "potentialImpact minimal 5 karakter")
    .optional(),
  existingControl: z
    .string()
    .trim()
    .min(3, "existingControl minimal 3 karakter")
    .optional(),
  riskLevel: z.enum(["Low", "Medium", "High"]).optional(),
  recommendedAction: z
    .string()
    .trim()
    .min(3, "recommendedAction minimal 3 karakter")
    .optional(),
  riskOwner: z.string().trim().min(2, "riskOwner minimal 2 karakter").optional(),
  targetDate: z.string().trim().min(4, "targetDate wajib diisi").optional(),
  status: z.enum(["Open", "In Progress", "Closed"]).optional(),
  remarks: z.string().optional(),
  sourceAssessmentId: z.string().optional(),
  sourceRopaId: z.string().optional(),
  departmentId: z.string().optional(),
  activityName: z.string().optional(),
});

const breachReportAnswersSchema = z.record(
  z.string(),
  z.union([z.string(), z.array(z.string())]),
);

export const breachReportCreateSchema = z.object({
  title: z.string().trim().min(3, "judul minimal 3 karakter"),
  departmentId: z.string().trim().min(1, "departemen wajib diisi"),
  answers: breachReportAnswersSchema.default({}),
});

export const breachReportUpdateSchema = z.object({
  title: z.string().trim().min(3, "judul minimal 3 karakter").optional(),
  departmentId: z.string().trim().min(1, "departemen wajib diisi").optional(),
  answers: breachReportAnswersSchema.optional(),
  status: z.enum(["Draft", "Submitted", "Finalized"]).optional(),
}).superRefine((value, context) => {
  if (value.status === "Submitted" || value.status === "Finalized") {
    const answers = value.answers ?? {};
    const missing = breachReportSections
      .flatMap((section) => section.fields)
      .filter((field) => field.required)
      .filter((field) => {
        const answer = answers[field.id];

        return Array.isArray(answer)
          ? answer.length === 0
          : !String(answer ?? "").trim();
      });

    missing.slice(0, 5).forEach((field) => {
      context.addIssue({
        code: "custom",
        path: ["answers", field.id],
        message: `${field.label} wajib diisi`,
      });
    });
  }
});

const selfAssessmentAnswerStateSchema = z.object({
  answer: z.enum(selfAssessmentAnswerValues).or(z.literal("")),
  note: z.string().default(""),
  pic: z.string().default(""),
  priority: z.enum(selfAssessmentPriorityValues).or(z.literal("")).default(""),
  evidenceFiles: z
    .array(
      z.object({
        id: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
        fileSize: z.number(),
        storageBucket: z.string(),
        storagePath: z.string(),
        uploadedAt: z.string(),
        uploadedBy: z.string().nullable().optional(),
      }),
    )
    .default([]),
});

const selfAssessmentAnswersSchema = z.record(
  z.string(),
  selfAssessmentAnswerStateSchema,
);

const selfAssessmentActionPlanSchema = z.object({
  id: z.string(),
  source: z.enum(selfAssessmentKindValues),
  questionId: z.string(),
  finding: z.string(),
  practicalRisk: z.string(),
  followUp: z.string(),
  owner: z.string().default(""),
  targetDate: z.string().default(""),
  status: z.enum(selfAssessmentActionStatusValues),
  priority: z.enum(selfAssessmentPriorityValues),
  note: z.string().default(""),
});

const selfAssessmentDataMapRowSchema = z.object({
  id: z.string(),
  activityName: z.string().default(""),
  subjectCategory: z.string().default(""),
  personalDataType: z.string().default(""),
  hasSpecificData: z.string().default(""),
  dataSource: z.string().default(""),
  processingPurpose: z.string().default(""),
  lawfulBasis: z.string().default(""),
  storageLocation: z.string().default(""),
  accessParties: z.string().default(""),
  recipientSharing: z.string().default(""),
  vendorProcessor: z.string().default(""),
  crossBorderCloud: z.string().default(""),
  retention: z.string().default(""),
  securityControl: z.string().default(""),
  unitPic: z.string().default(""),
  notes: z.string().default(""),
});

export const selfAssessmentCreateSchema = z.object({
  title: z.string().trim().optional(),
  departmentId: z.string().trim().min(1, "departemen wajib diisi"),
});

export const selfAssessmentUpdateSchema = z.object({
  title: z.string().trim().min(3, "judul minimal 3 karakter").optional(),
  departmentId: z.string().trim().min(1, "departemen wajib diisi").optional(),
  answers: selfAssessmentAnswersSchema.optional(),
  actionPlan: z.array(selfAssessmentActionPlanSchema).optional(),
  dataMap: z.array(selfAssessmentDataMapRowSchema).optional(),
  status: z.enum(selfAssessmentStatusValues).optional(),
});

const managedRoleSchema = z.enum(["MasterAdmin", "DPO", "User"]);

export const governanceSettingsUpdateSchema = z.object({
  controllerProcessorContacts: z
    .string()
    .trim()
    .min(5, "minimal 5 karakter"),
  dpoContact: z.string().trim().min(3, "minimal 3 karakter"),
});

export const moduleColumnSettingsUpdateSchema = z.object({
  module: z.enum(configurableModuleValues),
  visibleColumns: z.array(z.string().trim().min(1)).default([]),
  customColumns: z
    .array(
      z.object({
        key: z.string().trim().min(1),
        label: z.string().trim().min(1),
        description: z.string().trim().default(""),
        inputType: z.enum(moduleCustomColumnInputTypeValues).default("short_answer"),
        options: z.array(z.string().trim().min(1)).default([]),
      }),
    )
    .default([]),
});

export const managedUserCreateSchema = z.object({
  username: z.string().trim().min(3, "minimal 3 karakter"),
  fullName: z.string().trim().min(3, "minimal 3 karakter"),
  email: z.email("format email tidak valid"),
  role: managedRoleSchema,
  departmentName: z.string().trim().min(2, "departemen wajib diisi"),
  picName: z.string().trim().min(2, "minimal 2 karakter").optional(),
  picEmail: z.email("format email tidak valid").optional(),
  password: z.string().min(8, "password minimal 8 karakter"),
});

export const managedUserUpdateSchema = z
  .object({
    username: z.string().trim().min(3, "minimal 3 karakter").optional(),
    fullName: z.string().trim().min(3, "minimal 3 karakter").optional(),
    email: z.email("format email tidak valid").optional(),
    role: managedRoleSchema.optional(),
    departmentName: z.string().trim().min(2, "departemen wajib diisi").optional(),
    picName: z.string().trim().min(2, "minimal 2 karakter").optional(),
    picEmail: z.email("format email tidak valid").optional(),
    password: z.string().min(8, "password minimal 8 karakter").optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "payload update kosong",
  });

export const faqEntryCreateSchema = z.object({
  categoryId: z.string().trim().min(1, "kategori wajib dipilih"),
  question: z.string().trim().min(5, "pertanyaan minimal 5 karakter"),
  answer: z.string().trim().min(5, "jawaban minimal 5 karakter"),
  legalBasis: z.string().trim().default(""),
  benchmarkSupport: z.string().trim().default(""),
  status: z.string().trim().default(""),
});

export const faqEntryUpdateSchema = z
  .object({
    categoryId: z.string().trim().min(1, "kategori wajib dipilih").optional(),
    question: z.string().trim().min(5, "pertanyaan minimal 5 karakter").optional(),
    answer: z.string().trim().min(5, "jawaban minimal 5 karakter").optional(),
    legalBasis: z.string().trim().optional(),
    benchmarkSupport: z.string().trim().optional(),
    status: z.string().trim().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "payload update kosong",
  });

export const faqAskSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "pertanyaan minimal 3 karakter")
    .max(500, "pertanyaan maksimal 500 karakter"),
});

export const sopMetadataSchema = z.object({
  title: z.string().trim().min(3, "judul dokumen minimal 3 karakter"),
  category: z.enum(["Kebijakan", "SOP", "Template"], {
    error: "jenis dokumen wajib dipilih",
  }),
  summary: z.string().trim().default(""),
});

export const referenceDocumentCreateSchema = z.object({
  title: z.string().trim().min(3, "judul referensi minimal 3 karakter"),
  groupName: z.enum(["UU PDP", "RPP", "Aturan Sektoral", "Best Practice"], {
    error: "kategori referensi wajib dipilih",
  }),
  description: z.string().trim().default(""),
});

const allowedSopExtensions = new Set(["pdf", "doc", "docx"]);
const maxSopFileSize = 10 * 1024 * 1024;
const maxReferenceFileSize = 20 * 1024 * 1024;

export function validateSopUploadFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (!allowedSopExtensions.has(extension)) {
    return "Format file SOP harus PDF, DOC, atau DOCX.";
  }

  if (file.size > maxSopFileSize) {
    return "Ukuran file SOP maksimal 10MB.";
  }

  return null;
}

export function validateReferenceUploadFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (extension !== "pdf") {
    return "Format referensi harus PDF.";
  }

  if (file.size > maxReferenceFileSize) {
    return "Ukuran file referensi maksimal 20MB.";
  }

  return null;
}

const allowedSelfAssessmentEvidenceExtensions = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "png",
  "jpg",
  "jpeg",
]);
const maxSelfAssessmentEvidenceSize = 10 * 1024 * 1024;

export function validateSelfAssessmentEvidenceFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (!allowedSelfAssessmentEvidenceExtensions.has(extension)) {
    return "Format bukti harus PDF, DOC/DOCX, XLS/XLSX/CSV, PNG, JPG, atau JPEG.";
  }

  if (file.size > maxSelfAssessmentEvidenceSize) {
    return "Ukuran bukti maksimal 10MB.";
  }

  return null;
}

export const privacyMapOverridePatchSchema = z.object({
  jurisdictionId: z.string().trim().min(1, "jurisdiction wajib dipilih"),
  patch: z.object({
    mainLaw: z.string().trim().optional(),
    regulator: z.string().trim().optional(),
    regulatoryStatus: z.string().trim().optional(),
    pdpCategory: z.enum(["Khusus", "Parsial", "Tidak ada", "Unknown"]).optional(),
    effectiveStatus: z
      .enum([
        "In Force",
        "Partially In Force",
        "Pending",
        "Under Reform",
        "Repealed",
        "Guideline Only",
      ])
      .optional(),
    riskLevel: z.enum(["Critical", "High", "Medium", "Low", "Stable"]).optional(),
    sourceConfidence: z.enum(["High", "Medium", "Low"]).optional(),
    lastChecked: z.string().trim().optional(),
    practicalAction: z.string().trim().optional(),
    sourceUrls: z
      .object({
        primary: z.string().trim().optional(),
        breach: z.string().trim().optional(),
        transfer: z.string().trim().optional(),
      })
      .optional(),
    practicalHighlights: z
      .array(
        z.object({
          label: z.string().trim().min(1),
          value: z.string().trim(),
          tone: z
            .enum(["blue", "teal", "red", "orange", "purple", "slate"])
            .optional(),
        }),
      )
      .optional(),
  }),
});
