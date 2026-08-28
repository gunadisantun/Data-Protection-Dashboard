import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const departments = pgTable("departments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["MasterAdmin", "DPO", "User"] }).notNull(),
  departmentId: text("department_id").references(() => departments.id),
  picName: text("pic_name").notNull(),
  picEmail: text("pic_email").notNull(),
  createdAt: text("created_at").notNull(),
});

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  role: text("role", { enum: ["MasterAdmin", "DPO", "User"] })
    .notNull()
    .default("User"),
  departmentId: text("department_id"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const governanceSettings = pgTable("governance_settings", {
  id: text("id").primaryKey(),
  controllerProcessorContacts: text("controller_processor_contacts").notNull(),
  dpoContact: text("dpo_contact").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  updatedBy: text("updated_by").references(() => users.id),
});

export const moduleColumnSettings = pgTable("module_column_settings", {
  id: text("id").primaryKey(),
  module: text("module", { enum: ["ropa", "dpia", "tia", "lia"] }).notNull().unique(),
  visibleColumns: jsonb("visible_columns").$type<string[]>().notNull(),
  customColumns: jsonb("custom_columns")
    .$type<
      Array<{
        key: string;
        label: string;
        description: string;
        inputType: "short_answer" | "long_answer" | "checkbox" | "dropdown";
        options: string[];
      }>
    >()
    .notNull()
    .default([]),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  updatedBy: text("updated_by").references(() => users.id),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const ropaActivities = pgTable("ropa_activities", {
  id: text("id").primaryKey(),
  activityName: text("activity_name").notNull(),
  processDescription: text("process_description").notNull(),
  departmentId: text("department_id").notNull().references(() => departments.id),
  picName: text("pic_name").notNull(),
  picEmail: text("pic_email").notNull(),
  controllerProcessorContacts: text("controller_processor_contacts")
    .notNull()
    .default(""),
  dpoContact: text("dpo_contact").notNull().default(""),
  legalBasis: text("legal_basis").notNull(),
  processingPurpose: text("processing_purpose").notNull(),
  transferPurpose: text("transfer_purpose").notNull().default(""),
  sourceMechanism: text("source_mechanism").notNull(),
  subjectCategories: jsonb("subject_categories")
    .$type<string[]>()
    .notNull(),
  personalDataTypes: jsonb("personal_data_types")
    .$type<string[]>()
    .notNull(),
  recipients: text("recipients").notNull(),
  processorContractLink: text("processor_contract_link").notNull(),
  dataReceiverRole: text("data_receiver_role").notNull(),
  isCrossBorder: boolean("is_cross_border").notNull(),
  destinationCountry: text("destination_country").notNull(),
  exportProtectionMechanism: text("export_protection_mechanism").notNull(),
  transferMechanism: text("transfer_mechanism").notNull(),
  storageLocation: text("storage_location").notNull(),
  retentionPeriod: text("retention_period").notNull(),
  technicalMeasures: text("technical_measures").notNull(),
  organizationalMeasures: text("organizational_measures").notNull(),
  dataSubjectRights: text("data_subject_rights").notNull(),
  riskAssessmentLevel: text("risk_assessment_level").notNull(),
  highRiskCategories: jsonb("high_risk_categories")
    .$type<string[]>()
    .notNull()
    .default([]),
  riskRegisterReference: text("risk_register_reference").notNull().default(""),
  riskLikelihood: text("risk_likelihood").notNull().default("Medium"),
  riskImpact: text("risk_impact").notNull().default("Medium"),
  riskContext: text("risk_context").notNull().default(""),
  existingControls: text("existing_controls").notNull().default(""),
  residualRiskLevel: text("residual_risk_level").notNull().default("Medium"),
  riskMitigationPlan: text("risk_mitigation_plan").notNull().default(""),
  volumeLevel: text("volume_level").notNull(),
  usesAutomatedDecisionMaking: boolean("uses_automated_decision_making").notNull(),
  dataFlowMapping: text("data_flow_mapping").notNull().default(""),
  previousProcess: text("previous_process").notNull(),
  nextProcess: text("next_process").notNull(),
  status: text("status", { enum: ["Draft", "Active", "Archived"] }).notNull(),
  userId: text("user_id").references(() => users.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const assessments = pgTable("assessments", {
  id: text("id").primaryKey(),
  ropaId: text("ropa_id").notNull().references(() => ropaActivities.id),
  taskType: text("task_type", { enum: ["DPIA", "TIA", "LIA"] }).notNull(),
  status: text("status", { enum: ["Todo", "In Progress", "Done"] }).notNull(),
  severity: text("severity", { enum: ["Required", "Critical"] }).notNull(),
  title: text("title").notNull(),
  reason: text("reason").notNull(),
  notes: text("notes").notNull(),
  dueDate: text("due_date").notNull(),
  picName: text("pic_name").notNull(),
  departmentId: text("department_id").notNull().references(() => departments.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const aiImpactAssessments = pgTable("ai_impact_assessments", {
  id: text("id").primaryKey(),
  assessmentNumber: text("assessment_number").notNull().unique(),
  primaryRopaId: text("primary_ropa_id").references(() => ropaActivities.id, {
    onDelete: "set null",
  }),
  relatedRopaIds: jsonb("related_ropa_ids").$type<string[]>().notNull().default([]),
  relatedDpiaId: text("related_dpia_id").references(() => assessments.id, {
    onDelete: "set null",
  }),
  relatedLiaId: text("related_lia_id").references(() => assessments.id, {
    onDelete: "set null",
  }),
  relatedTiaId: text("related_tia_id").references(() => assessments.id, {
    onDelete: "set null",
  }),
  departmentId: text("department_id").notNull().references(() => departments.id),
  status: text("status", { enum: ["Draft", "In Progress", "Completed", "Archived"] })
    .notNull()
    .default("Draft"),
  approvalStatus: text("approval_status").notNull().default("Not Started"),
  ownerName: text("owner_name").notNull().default(""),
  aiSystem: text("ai_system").notNull(),
  businessOwner: text("business_owner").notNull().default(""),
  intendedPurpose: text("intended_purpose").notNull().default(""),
  providerDeveloper: text("provider_developer").notNull().default(""),
  affectedPersons: text("affected_persons").notNull().default(""),
  jurisdictions: text("jurisdictions").notNull().default(""),
  intendedBenefit: text("intended_benefit").notNull().default(""),
  foreseeableMisuse: text("foreseeable_misuse").notNull().default(""),
  importedSnapshot: jsonb("imported_snapshot").$type<Record<string, unknown>>().notNull().default({}),
  provenance: jsonb("provenance")
    .$type<
      Record<
        string,
        {
          sourceModule: "ROPA" | "DPIA" | "LIA" | "TIA";
          sourceId: string;
          sourceField: string;
          importedAt: string;
          importedBy: string;
        }
      >
    >()
    .notNull()
    .default({}),
  impactDomains: jsonb("impact_domains")
    .$type<
      Array<{
        id: string;
        domain: string;
        potentialNegativeImpact: string;
        affectedPersonGroup: string;
        severity: number | null;
        likelihood: number | null;
        inherentScore: number | null;
        existingControls: string;
        controlEffectiveness: number;
        residualScore: number | null;
        residualRiskLevel: "Low" | "Medium" | "High" | "Critical" | "";
        furtherAction: string;
        owner: string;
        status: "Not Started" | "In Progress" | "Completed" | "Accepted";
      }>
    >()
    .notNull(),
  friaScreening: jsonb("fria_screening")
    .$type<Record<string, "Yes" | "No" | "Potential" | "TBD" | "N/A" | "">>()
    .notNull()
    .default({}),
  friaStatus: text("fria_status", {
    enum: ["FRIA REQUIRED", "FRIA NOT TRIGGERED", "FURTHER ASSESSMENT"],
  })
    .notNull()
    .default("FURTHER ASSESSMENT"),
  friaItems: jsonb("fria_items")
    .$type<
      Array<{
        id: string;
        article: string;
        question: string;
        response: string;
        evidenceReference: string;
        owner: string;
        status: "Not Started" | "In Progress" | "Completed" | "N/A";
      }>
    >()
    .notNull(),
  friaCompletion: integer("fria_completion").notNull().default(0),
  dataProtection: jsonb("data_protection")
    .$type<{
      processesPersonalData: "Yes" | "No" | "TBD";
      result: string;
    }>()
    .notNull(),
  specialistAssessment: jsonb("specialist_assessment")
    .$type<{
      required: "Yes" | "No" | "TBD";
      types: string[];
    }>()
    .notNull(),
  highestResidualRisk: text("highest_residual_risk", {
    enum: ["Low", "Medium", "High", "Critical", "Incomplete"],
  })
    .notNull()
    .default("Incomplete"),
  finalDecision: text("final_decision").notNull(),
  createdBy: text("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const assessmentLinks = pgTable("assessment_links", {
  id: text("id").primaryKey(),
  sourceModule: text("source_module").notNull(),
  sourceId: text("source_id").notNull(),
  targetModule: text("target_module").notNull(),
  targetId: text("target_id").notNull(),
  relationType: text("relation_type").notNull(),
  createdAt: text("created_at").notNull(),
  createdBy: text("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
});

export const riskRegisterEntries = pgTable("risk_register_entries", {
  id: text("id").primaryKey(),
  riskId: text("risk_id").notNull(),
  riskDescription: text("risk_description").notNull(),
  potentialImpact: text("potential_impact").notNull(),
  existingControl: text("existing_control").notNull(),
  riskLevel: text("risk_level", { enum: ["Low", "Medium", "High"] }).notNull(),
  recommendedAction: text("recommended_action").notNull(),
  riskOwner: text("risk_owner").notNull(),
  targetDate: text("target_date").notNull(),
  status: text("status", { enum: ["Open", "In Progress", "Closed"] }).notNull(),
  remarks: text("remarks").notNull().default(""),
  sourceAssessmentId: text("source_assessment_id").references(() => assessments.id, {
    onDelete: "set null",
  }),
  sourceRopaId: text("source_ropa_id").references(() => ropaActivities.id, {
    onDelete: "set null",
  }),
  departmentId: text("department_id").references(() => departments.id, {
    onDelete: "set null",
  }),
  activityName: text("activity_name").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const auditEvents = pgTable("audit_events", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").references(() => users.id),
  eventType: text("event_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull(),
});

export const breachReports = pgTable("breach_reports", {
  id: text("id").primaryKey(),
  reportNumber: text("report_number").notNull().unique(),
  title: text("title").notNull(),
  departmentId: text("department_id").references(() => departments.id, {
    onDelete: "set null",
  }),
  status: text("status", { enum: ["Draft", "Submitted", "Finalized"] })
    .notNull()
    .default("Draft"),
  answers: jsonb("answers").$type<Record<string, string | string[]>>().notNull(),
  reportedBy: text("reported_by").references(() => users.id, {
    onDelete: "set null",
  }),
  finalizedBy: text("finalized_by").references(() => users.id, {
    onDelete: "set null",
  }),
  finalizedAt: text("finalized_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const selfAssessments = pgTable("self_assessments", {
  id: text("id").primaryKey(),
  assessmentNumber: text("assessment_number").notNull().unique(),
  title: text("title").notNull(),
  departmentId: text("department_id").references(() => departments.id, {
    onDelete: "set null",
  }),
  status: text("status", { enum: ["Draft", "Submitted", "Finalized"] })
    .notNull()
    .default("Draft"),
  answers: jsonb("answers")
    .$type<
      Record<
        string,
        {
          answer: string;
          note: string;
          pic: string;
          priority: string;
          evidenceFiles?: Array<{
            id: string;
            fileName: string;
            mimeType: string;
            fileSize: number;
            storageBucket: string;
            storagePath: string;
            uploadedAt: string;
            uploadedBy?: string | null;
          }>;
        }
      >
    >()
    .notNull(),
  actionPlan: jsonb("action_plan")
    .$type<
      Array<{
        id: string;
        source: string;
        questionId: string;
        finding: string;
        practicalRisk: string;
        followUp: string;
        owner: string;
        targetDate: string;
        status: string;
        priority: string;
        note: string;
      }>
    >()
    .notNull(),
  dataMap: jsonb("data_map")
    .$type<
      Array<{
        id: string;
        activityName: string;
        subjectCategory: string;
        personalDataType: string;
        hasSpecificData: string;
        dataSource: string;
        processingPurpose: string;
        lawfulBasis: string;
        storageLocation: string;
        accessParties: string;
        recipientSharing: string;
        vendorProcessor: string;
        crossBorderCloud: string;
        retention: string;
        securityControl: string;
        unitPic: string;
        notes: string;
      }>
    >()
    .notNull()
    .default([]),
  createdBy: text("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  finalizedBy: text("finalized_by").references(() => users.id, {
    onDelete: "set null",
  }),
  finalizedAt: text("finalized_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const faqCategories = pgTable("faq_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  scope: text("scope").notNull().default(""),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const faqEntries = pgTable("faq_entries", {
  id: text("id").primaryKey(),
  categoryId: text("category_id")
    .notNull()
    .references(() => faqCategories.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  legalBasis: text("legal_basis").notNull().default(""),
  benchmarkSupport: text("benchmark_support").notNull().default(""),
  status: text("status").notNull().default(""),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  createdBy: text("created_by").references(() => users.id),
  updatedBy: text("updated_by").references(() => users.id),
});

export const faqReferences = pgTable("faq_references", {
  id: text("id").primaryKey(),
  groupName: text("group_name").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  url: text("url").notNull(),
  fileName: text("file_name").notNull().default(""),
  mimeType: text("mime_type").notNull().default("application/pdf"),
  fileSize: integer("file_size").notNull().default(0),
  storageBucket: text("storage_bucket").notNull().default(""),
  storagePath: text("storage_path").notNull().default(""),
  fileContentBase64: text("file_content_base64").notNull().default(""),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const sopDocuments = pgTable("sop_documents", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  summary: text("summary").notNull().default(""),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  storageBucket: text("storage_bucket").notNull(),
  storagePath: text("storage_path").notNull(),
  uploadedBy: text("uploaded_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: text("id").primaryKey(),
  sourceType: text("source_type", { enum: ["FAQ", "REFERENCE", "SOP"] }).notNull(),
  sourceId: text("source_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  url: text("url"),
  metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const legalMappingOverrides = pgTable("legal_mapping_overrides", {
  id: text("id").primaryKey(),
  entryId: text("entry_id").notNull().unique(),
  patch: jsonb("patch")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
});

export const privacyMapOverrides = pgTable("privacy_map_overrides", {
  id: text("id").primaryKey(),
  jurisdictionId: text("jurisdiction_id").notNull().unique(),
  patch: jsonb("patch")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
});

export const regulatoryUpdates = pgTable("regulatory_updates", {
  id: text("id").primaryKey(),
  country: text("country").notNull(),
  iso2: text("iso2").notNull(),
  iso3: text("iso3").notNull(),
  region: text("region").notNull(),
  category: text("category").notNull(),
  requirementType: text("requirement_type").notNull(),
  riskLevel: text("risk_level", {
    enum: ["Low", "Medium", "High", "Critical", "Not Assessed"],
  }).notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  keyChange: text("key_change").notNull(),
  businessImpact: text("business_impact").notNull(),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceLastUpdated: text("source_last_updated"),
  sourceCheckedAt: text("source_checked_at").notNull(),
  aiConfidence: integer("ai_confidence"),
  reviewStatus: text("review_status", {
    enum: ["Draft", "Reviewed", "Published", "Rejected"],
  }).notNull(),
  reviewerNote: text("reviewer_note"),
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const regulatorySources = pgTable("regulatory_sources", {
  id: text("id").primaryKey(),
  country: text("country").notNull(),
  iso2: text("iso2").notNull(),
  iso3: text("iso3").notNull(),
  region: text("region").notNull(),
  sourceName: text("source_name").notNull(),
  baseUrl: text("base_url").notNull(),
  topic: text("topic").notNull(),
  generatedUrl: text("generated_url").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const departmentsRelations = relations(departments, ({ many }) => ({
  users: many(users),
  ropaActivities: many(ropaActivities),
  assessments: many(assessments),
  riskRegisterEntries: many(riskRegisterEntries),
  breachReports: many(breachReports),
  selfAssessments: many(selfAssessments),
  aiImpactAssessments: many(aiImpactAssessments),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  ropaActivities: many(ropaActivities),
  faqEntriesCreated: many(faqEntries, { relationName: "faq_entries_created_by" }),
  faqEntriesUpdated: many(faqEntries, { relationName: "faq_entries_updated_by" }),
  sopDocuments: many(sopDocuments),
  breachReports: many(breachReports),
  selfAssessments: many(selfAssessments),
  privacyMapOverrides: many(privacyMapOverrides),
  aiImpactAssessments: many(aiImpactAssessments),
}));

export const ropaRelations = relations(ropaActivities, ({ one, many }) => ({
  department: one(departments, {
    fields: [ropaActivities.departmentId],
    references: [departments.id],
  }),
  user: one(users, {
    fields: [ropaActivities.userId],
    references: [users.id],
  }),
  assessments: many(assessments),
  riskRegisterEntries: many(riskRegisterEntries),
  aiImpactAssessments: many(aiImpactAssessments),
}));

export const assessmentsRelations = relations(assessments, ({ one }) => ({
  ropa: one(ropaActivities, {
    fields: [assessments.ropaId],
    references: [ropaActivities.id],
  }),
  department: one(departments, {
    fields: [assessments.departmentId],
    references: [departments.id],
  }),
}));

export const aiImpactAssessmentsRelations = relations(
  aiImpactAssessments,
  ({ one }) => ({
    department: one(departments, {
      fields: [aiImpactAssessments.departmentId],
      references: [departments.id],
    }),
    primaryRopa: one(ropaActivities, {
      fields: [aiImpactAssessments.primaryRopaId],
      references: [ropaActivities.id],
    }),
    creator: one(users, {
      fields: [aiImpactAssessments.createdBy],
      references: [users.id],
    }),
    updater: one(users, {
      fields: [aiImpactAssessments.updatedBy],
      references: [users.id],
    }),
  }),
);

export const riskRegisterRelations = relations(riskRegisterEntries, ({ one }) => ({
  assessment: one(assessments, {
    fields: [riskRegisterEntries.sourceAssessmentId],
    references: [assessments.id],
  }),
  ropa: one(ropaActivities, {
    fields: [riskRegisterEntries.sourceRopaId],
    references: [ropaActivities.id],
  }),
  department: one(departments, {
    fields: [riskRegisterEntries.departmentId],
    references: [departments.id],
  }),
}));

export const breachReportsRelations = relations(breachReports, ({ one }) => ({
  department: one(departments, {
    fields: [breachReports.departmentId],
    references: [departments.id],
  }),
  reporter: one(users, {
    fields: [breachReports.reportedBy],
    references: [users.id],
  }),
  finalizer: one(users, {
    fields: [breachReports.finalizedBy],
    references: [users.id],
  }),
}));

export const selfAssessmentsRelations = relations(selfAssessments, ({ one }) => ({
  department: one(departments, {
    fields: [selfAssessments.departmentId],
    references: [departments.id],
  }),
  creator: one(users, {
    fields: [selfAssessments.createdBy],
    references: [users.id],
  }),
  finalizer: one(users, {
    fields: [selfAssessments.finalizedBy],
    references: [users.id],
  }),
}));

export const faqCategoriesRelations = relations(faqCategories, ({ many }) => ({
  entries: many(faqEntries),
}));

export const faqEntriesRelations = relations(faqEntries, ({ one }) => ({
  category: one(faqCategories, {
    fields: [faqEntries.categoryId],
    references: [faqCategories.id],
  }),
  creator: one(users, {
    fields: [faqEntries.createdBy],
    references: [users.id],
    relationName: "faq_entries_created_by",
  }),
  updater: one(users, {
    fields: [faqEntries.updatedBy],
    references: [users.id],
    relationName: "faq_entries_updated_by",
  }),
}));

export const sopDocumentsRelations = relations(sopDocuments, ({ one }) => ({
  uploader: one(users, {
    fields: [sopDocuments.uploadedBy],
    references: [users.id],
  }),
}));

export const privacyMapOverridesRelations = relations(privacyMapOverrides, ({ one }) => ({
  updater: one(users, {
    fields: [privacyMapOverrides.updatedBy],
    references: [users.id],
  }),
}));
