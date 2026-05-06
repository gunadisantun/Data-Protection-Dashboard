import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const departments = sqliteTable("departments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["Admin", "PIC"] }).notNull(),
  departmentId: text("department_id").references(() => departments.id),
  createdAt: text("created_at").notNull(),
});

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
  image: text("image"),
  role: text("role").notNull().default("PIC"),
  departmentId: text("department_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const ropaActivities = sqliteTable("ropa_activities", {
  id: text("id").primaryKey(),
  activityName: text("activity_name").notNull(),
  processDescription: text("process_description").notNull(),
  departmentId: text("department_id").notNull().references(() => departments.id),
  picName: text("pic_name").notNull(),
  picEmail: text("pic_email").notNull(),
  legalBasis: text("legal_basis").notNull(),
  processingPurpose: text("processing_purpose").notNull(),
  sourceMechanism: text("source_mechanism").notNull(),
  subjectCategories: text("subject_categories", { mode: "json" })
    .$type<string[]>()
    .notNull(),
  personalDataTypes: text("personal_data_types", { mode: "json" })
    .$type<string[]>()
    .notNull(),
  recipients: text("recipients").notNull(),
  processorContractLink: text("processor_contract_link").notNull(),
  dataReceiverRole: text("data_receiver_role").notNull(),
  isCrossBorder: integer("is_cross_border", { mode: "boolean" }).notNull(),
  destinationCountry: text("destination_country").notNull(),
  exportProtectionMechanism: text("export_protection_mechanism").notNull(),
  transferMechanism: text("transfer_mechanism").notNull(),
  storageLocation: text("storage_location").notNull(),
  retentionPeriod: text("retention_period").notNull(),
  technicalMeasures: text("technical_measures").notNull(),
  organizationalMeasures: text("organizational_measures").notNull(),
  dataSubjectRights: text("data_subject_rights").notNull(),
  riskAssessmentLevel: text("risk_assessment_level").notNull(),
  highRiskCategories: text("high_risk_categories", { mode: "json" })
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
  usesAutomatedDecisionMaking: integer("uses_automated_decision_making", {
    mode: "boolean",
  }).notNull(),
  previousProcess: text("previous_process").notNull(),
  nextProcess: text("next_process").notNull(),
  status: text("status", { enum: ["Draft", "Active", "Archived"] }).notNull(),
  userId: text("user_id").references(() => users.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const assessments = sqliteTable("assessments", {
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

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").references(() => users.id),
  eventType: text("event_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull(),
});

export const departmentsRelations = relations(departments, ({ many }) => ({
  users: many(users),
  ropaActivities: many(ropaActivities),
  assessments: many(assessments),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  ropaActivities: many(ropaActivities),
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
